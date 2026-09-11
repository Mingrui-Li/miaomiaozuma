"""Refine Vision's loose mask using RGB evidence; preserve raw extraction (D016)."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]/'art/source/ui04'
cv2.setRNGSeed(4)
for breed in ['orange','ragdoll','blue','calico']:
    destination=root/f'cat_{breed}_refined.png'
    if destination.exists(): continue
    original=np.array(Image.open(root/f'cat_{breed}_original.png').convert('RGB'))
    alpha=np.array(Image.open(root/f'cat_{breed}_alpha.png').getchannel('A'))
    inside=(alpha>127).astype('uint8')
    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(35,35))
    sure=cv2.erode(inside,kernel); possible=cv2.dilate(inside,kernel)
    mask=np.full(inside.shape,cv2.GC_BGD,dtype='uint8')
    mask[possible>0]=cv2.GC_PR_BGD;mask[inside>0]=cv2.GC_PR_FGD;mask[sure>0]=cv2.GC_FGD
    cv2.grabCut(original,mask,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
    binary=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype('uint8')*255
    # Half-pixel anti-aliasing, then slight inward contraction removes background fringe.
    binary=cv2.erode(binary,np.ones((3,3),dtype='uint8'))
    soft=cv2.GaussianBlur(binary,(3,3),0.5)
    result=Image.fromarray(original).convert('RGBA');result.putalpha(Image.fromarray(soft));result.save(destination)
    print(destination.name)
