// Offline macOS Vision extraction. D016 authorizes local image processing.
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <CoreImage/CoreImage.h>
int main(int argc, const char *argv[]) { @autoreleasepool {
  if (argc != 3) { fprintf(stderr,"usage: matte input.png output.png\n"); return 2; }
  NSURL *source=[NSURL fileURLWithPath:@(argv[1])], *destination=[NSURL fileURLWithPath:@(argv[2])];
  if ([[NSFileManager defaultManager] fileExistsAtPath:destination.path]) return 3;
  NSError *error=nil;
  VNImageRequestHandler *handler=[[VNImageRequestHandler alloc] initWithURL:source options:@{}];
  VNGenerateForegroundInstanceMaskRequest *request=[VNGenerateForegroundInstanceMaskRequest new];
  if (![handler performRequests:@[request] error:&error]) { NSLog(@"%@",error); return 4; }
  VNInstanceMaskObservation *observation=request.results.firstObject;
  if (!observation.allInstances.count) return 5;
  CVPixelBufferRef mask=[observation generateScaledMaskForImageForInstances:observation.allInstances fromRequestHandler:handler error:&error];
  if (!mask) { NSLog(@"%@",error); return 6; }
  CIImage *input=[CIImage imageWithContentsOfURL:source];
  CIImage *background=[[CIImage imageWithColor:CIColor.clearColor] imageByCroppingToRect:input.extent];
  CIImage *output=[input imageByApplyingFilter:@"CIBlendWithMask" withInputParameters:@{kCIInputBackgroundImageKey:background,kCIInputMaskImageKey:[CIImage imageWithCVPixelBuffer:mask]}];
  CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
  BOOL ok=[[CIContext context] writePNGRepresentationOfImage:output toURL:destination format:kCIFormatRGBA8 colorSpace:space options:@{} error:&error];
  CGColorSpaceRelease(space); CVPixelBufferRelease(mask);
  if (!ok) { NSLog(@"%@",error); return 7; }
  puts(destination.path.UTF8String); return 0;
} }
