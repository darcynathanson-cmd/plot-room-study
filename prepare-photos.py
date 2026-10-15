"""Prepare one to three local photo/depth pairs. No downloads or uploads. Requires Pillow, numpy, onnxruntime."""
import argparse,base64,io,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
import onnxruntime as ort
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--model',required=True,help='Existing Depth Anything V2 Small quantized ONNX model')
p.add_argument('--input',required=True,help='JSON list: [{file,label,credit,url,alt}, ...], max 3 photos')
p.add_argument('--output',required=True,help='Output photo-set JSON')
a=p.parse_args()
source=Path(a.input).resolve();entries=json.loads(source.read_text());model=Path(a.model)
if not model.is_file():raise SystemExit('Model missing. This script does not download it.')
if not isinstance(entries,list) or not 1<=len(entries)<=3:raise SystemExit('Provide one to three photo records.')
opts=ort.SessionOptions();opts.intra_op_num_threads=4
session=ort.InferenceSession(str(model),opts,providers=['CPUExecutionProvider'])
photos=[]
for i,entry in enumerate(entries):
 for key in ['file','label','credit','alt']:
  if not isinstance(entry.get(key),str) or not entry[key].strip():raise SystemExit('Every photo needs '+key)
 path=Path(entry['file']);path=path if path.is_absolute() else source.parent/path
 # The same 3:2 crop is used for both the image and its depth estimate.
 image=ImageOps.fit(ImageOps.exif_transpose(Image.open(path)).convert('RGB'),(435,290),method=Image.Resampling.LANCZOS)
 scale=max(518/290,518/435);nw,nh=[int(round(v*scale/14)*14) for v in (435,290)]
 tensor=np.asarray(image.resize((nw,nh),Image.Resampling.BICUBIC)).astype(np.float32)/255
 tensor=(tensor-np.array([.485,.456,.406],np.float32))/np.array([.229,.224,.225],np.float32)
 tensor=np.transpose(tensor,(2,0,1))[None].copy()
 estimate=session.run(None,{'pixel_values':tensor})[0].squeeze()
 estimate=np.asarray(Image.fromarray(estimate.astype(np.float32)).resize((435,290),Image.Resampling.BICUBIC))
 if not np.isfinite(estimate).all():raise SystemExit('Model returned non-finite depth')
 lo,hi=np.percentile(estimate,[1,99])
 if hi<=lo:raise SystemExit('Model returned constant depth')
 inverse=np.clip((estimate-lo)/(hi-lo),0,1)
 depth=(1-inverse)**1.25
 luminance=(np.asarray(image,dtype=np.float32)/255)@np.array([.2126,.7152,.0722])
 # Use the same stable sampling rule as the original point-depth experiment.
 keep=np.random.default_rng(1441).random((290,435)) < (.25+.62*luminance)
 samples=np.empty((290,435,2),np.uint8);samples[:,:,0]=np.rint(depth*255).astype(np.uint8)
 samples[:,:,1]=np.where(keep,np.rint(luminance*254).astype(np.uint8)+1,0)
 jpeg=io.BytesIO();image.save(jpeg,format='JPEG',quality=92)
 photos.append({'id':'plot-'+str(i+1).zfill(2),'label':entry['label'],'credit':entry['credit'],'alt':entry['alt'],'url':entry.get('url',''),'depthModel':'Depth Anything V2 Small (Yang et al., 2024)','width':435,'height':290,'image':'data:image/jpeg;base64,'+base64.b64encode(jpeg.getvalue()).decode(),'samples':base64.b64encode(samples.tobytes()).decode()})
Path(a.output).write_text(json.dumps({'version':1,'photos':photos},ensure_ascii=False))
print('Prepared',len(photos),'photo/depth pairs:',a.output)
