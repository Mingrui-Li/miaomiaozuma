// Local offline foreground extraction, explicitly authorized by D016.
import Foundation
import Vision
import CoreImage
import AppKit

guard CommandLine.arguments.count == 3 else { fatalError("usage: matte input.png output.png") }
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
guard !FileManager.default.fileExists(atPath: destination.path) else { fatalError("refuse overwrite") }
let handler = VNImageRequestHandler(url: source)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let observation = request.results?.first, !observation.allInstances.isEmpty else { fatalError("no foreground") }
let mask = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
let input = CIImage(contentsOf: source)!
let output = input.applyingFilter("CIBlendWithMask", parameters: [
    kCIInputBackgroundImageKey: CIImage(color: .clear).cropped(to: input.extent),
    kCIInputMaskImageKey: CIImage(cvPixelBuffer: mask)
])
try CIContext().writePNGRepresentation(of: output, to: destination, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
print(destination.path)
