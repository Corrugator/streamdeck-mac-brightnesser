import Cocoa
import Foundation
import IOKit

guard let handle = dlopen(
  "/System/Library/PrivateFrameworks/DisplayServices.framework/DisplayServices",
  RTLD_NOW
) else {
  fputs("ERROR: Cannot load DisplayServices\n", stderr)
  exit(1)
}

typealias GetBrFn = @convention(c) (UInt32, UnsafeMutablePointer<Float>) -> Int32
typealias SetBrFn = @convention(c) (UInt32, Float) -> Int32

guard let getPtr = dlsym(handle, "DisplayServicesGetBrightness"),
      let setPtr = dlsym(handle, "DisplayServicesSetBrightness")
else {
  fputs("ERROR: Cannot find DisplayServices functions\n", stderr)
  exit(1)
}

let getBrightness = unsafeBitCast(getPtr, to: GetBrFn.self)
let setBrightness = unsafeBitCast(setPtr, to: SetBrFn.self)

struct DisplayInfo {
  let id: UInt32
  let index: Int
  let isBuiltIn: Bool
  var brightness: Float
  var dsSupported: Bool  // true if DisplayServices works for this display
  var name: String
  let vendor: UInt32
  let model: UInt32
  let serial: UInt32
}

func getIODisplayNames() -> [String: [String]] {
  var result: [String: [String]] = [:]

  let serviceClasses = ["IODisplayConnect", "IOMobileFramebufferShim", "DCPAVServiceProxy"]
  for serviceClass in serviceClasses {
    var iter: io_iterator_t = 0
    guard let matching = IOServiceMatching(serviceClass),
          IOServiceGetMatchingServices(kIOMainPortDefault, matching, &iter) == KERN_SUCCESS
    else { continue }

    var service = IOIteratorNext(iter)
    while service != 0 {
      if let infoDict = IODisplayCreateInfoDictionary(
        service, IOOptionBits(kIODisplayOnlyPreferredName)
      )?.takeRetainedValue() as? [String: Any],
         let vendorID = infoDict["DisplayVendorID"] as? UInt32,
         let productID = infoDict["DisplayProductID"] as? UInt32,
         let names = infoDict["DisplayProductName"] as? [String: String],
         let name = names.values.first
      {
        let key = "\(vendorID)-\(productID)"
        if result[key] == nil { result[key] = [] }
        if !(result[key]!.contains(name)) || result[key]!.count < 4 {
          result[key]!.append(name)
        }
      }
      IOObjectRelease(service)
      service = IOIteratorNext(iter)
    }
    IOObjectRelease(iter)

    if !result.isEmpty { break }
  }
  return result
}

func listDisplays() -> [DisplayInfo] {
  var available: UInt32 = 0
  CGGetOnlineDisplayList(0, nil, &available)
  let cap = max(available, 1)
  var displayIDs = [UInt32](repeating: 0, count: Int(cap))
  var count: UInt32 = 0
  CGGetOnlineDisplayList(cap, &displayIDs, &count)

  let ioNames = getIODisplayNames()
  var seenNames: [String: Int] = [:]

  var displays: [DisplayInfo] = []
  for i in 0 ..< Int(count) {
    let id = displayIDs[i]

    // Test if DisplayServices works for this display
    var brightness: Float = -1
    let getResult = getBrightness(id, &brightness)
    let dsSupported = (getResult == 0 && brightness >= 0 && brightness <= 1)

    let isBuiltIn = CGDisplayIsBuiltin(id) != 0
    var name: String

    let vendor = CGDisplayVendorNumber(id)
    let model = CGDisplayModelNumber(id)
    let key = "\(vendor)-\(model)"

    if isBuiltIn {
      name = "MacBook Display"
    } else {
      let knownModels: [UInt32: [UInt32: String]] = [
        0x610: [  // Apple
          0xae3a: "Studio Display",
          0xa034: "Pro Display XDR",
          0xa030: "Thunderbolt Display",
        ]
      ]

      seenNames[key, default: 0] += 1
      let seen = seenNames[key]!

      if let names = ioNames[key], !names.isEmpty {
        let baseName = names.first!
        name = names.count > 1 || seen > 1 ? "\(baseName) \(seen)" : baseName
      } else if let knownName = knownModels[vendor]?[model] {
        name = seen > 1 ? "\(knownName) \(seen)" : knownName
      } else {
        name = "Display \(i + 1)"
      }
    }

    let serial = CGDisplaySerialNumber(id)
    displays.append(DisplayInfo(
      id: id, index: i, isBuiltIn: isBuiltIn,
      brightness: dsSupported ? brightness : -1,
      dsSupported: dsSupported, name: name,
      vendor: vendor, model: model, serial: serial
    ))
  }
  return displays
}

// --- Highlight ---

// NSPanel subclass that contractually refuses to ever become key or main.
// `.nonactivatingPanel` already makes that the default, but the system can
// still flip it back to key on certain interactions; hard-coding `false`
// here means the panel cannot route keystrokes away from whichever app
// (Stream Deck's Property Inspector) the user is currently typing into.
final class FlashOverlayPanel: NSPanel {
  override var canBecomeKey: Bool { return false }
  override var canBecomeMain: Bool { return false }
  override var acceptsFirstResponder: Bool { return false }
}

func highlightDisplay(cgDisplayID: UInt32, duration: Double = 2.0) {
  let targetID = cgDisplayID
  let app = NSApplication.shared
  // .accessory keeps us out of the Dock; combined with .nonactivatingPanel
  // below this means the helper never steals keyboard focus from the
  // currently-active app (e.g. Stream Deck's Property Inspector).
  app.setActivationPolicy(.accessory)

  guard let targetScreen = NSScreen.screens.first(where: { screen in
    let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? UInt32
    return screenNumber == targetID
  }) else {
    fputs("ERROR: Could not find NSScreen for display \(targetID)\n", stderr)
    exit(1)
  }

  let borderWidth: CGFloat = 6
  // FlashOverlayPanel + .nonactivatingPanel is the canonical recipe for
  // an overlay that draws on screen without ever activating the owning
  // process or claiming key/main window status — the subclass enforces
  // canBecomeKey=false / canBecomeMain=false so the PI's text field
  // keeps receiving keystrokes uninterrupted while the border is up.
  let window = FlashOverlayPanel(
    contentRect: targetScreen.frame,
    styleMask: [.borderless, .nonactivatingPanel],
    backing: .buffered,
    defer: false,
    screen: targetScreen
  )
  window.level = .screenSaver
  window.backgroundColor = .clear
  window.isOpaque = false
  window.hasShadow = false
  window.ignoresMouseEvents = true
  window.becomesKeyOnlyIfNeeded = true
  window.hidesOnDeactivate = false
  window.collectionBehavior = [.canJoinAllSpaces, .stationary, .transient, .ignoresCycle, .fullScreenAuxiliary]

  let borderView = NSView(frame: window.contentView!.bounds)
  borderView.wantsLayer = true
  borderView.layer?.borderColor = NSColor.red.cgColor
  borderView.layer?.borderWidth = borderWidth
  borderView.layer?.cornerRadius = 0
  borderView.layer?.backgroundColor = CGColor.clear
  window.contentView?.addSubview(borderView)

  window.setFrame(targetScreen.frame, display: true)
  // orderFrontRegardless brings us forward without activating the app
  // (which .nonactivatingPanel + .accessory already forbid anyway).
  window.orderFrontRegardless()

  DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
    window.close()
    app.terminate(nil)
  }

  app.run()
}

// --- CLI ---

let args = CommandLine.arguments
guard args.count >= 2 else {
  fputs("Usage: brightness-helper list | get <index> | set <index> <0-100> | highlight <cgDisplayID> [duration]\n", stderr)
  exit(1)
}

switch args[1] {
case "list":
  // Output format: index|cgDisplayID|isBuiltIn|brightness%|name|dsSupported|vendor|model|serial
  for d in listDisplays() {
    let pct = d.dsSupported ? Int(round(d.brightness * 100)) : -1
    print("\(d.index)|\(d.id)|\(d.isBuiltIn)|\(pct)|\(d.name)|\(d.dsSupported)|\(d.vendor)|\(d.model)|\(d.serial)")
  }

case "get":
  guard args.count >= 3, let index = Int(args[2]) else { exit(1) }
  let displays = listDisplays()
  guard index >= 0, index < displays.count else { exit(1) }
  let d = displays[index]
  if d.dsSupported {
    print(Int(round(d.brightness * 100)))
  } else {
    print("-1")
  }

case "set":
  guard args.count >= 4, let index = Int(args[2]), let pct = Int(args[3]) else { exit(1) }
  let displays = listDisplays()
  guard index >= 0, index < displays.count else { exit(1) }
  let d = displays[index]
  if !d.dsSupported {
    fputs("ERROR: DisplayServices not supported for this display\n", stderr)
    exit(2)
  }
  let clamped = max(0, min(100, pct))
  let result = setBrightness(d.id, Float(clamped) / 100.0)
  if result != 0 {
    fputs("ERROR: SetBrightness returned \(result)\n", stderr)
    exit(1)
  }
  print(clamped)

case "highlight":
  guard args.count >= 3, let cgID = UInt32(args[2]) else { exit(1) }
  let duration = args.count >= 4 ? (Double(args[3]) ?? 2.0) : 2.0
  highlightDisplay(cgDisplayID: cgID, duration: duration)

default:
  fputs("Unknown command: \(args[1])\n", stderr)
  exit(1)
}
