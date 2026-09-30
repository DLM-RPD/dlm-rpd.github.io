from pathlib import Path
import json,math,sys
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'static/traces/examples.json').read_text())
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';mono='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
F=ImageFont.truetype(font,14);S=ImageFont.truetype(font,11);B=ImageFont.truetype(bold,20);T=ImageFont.truetype(bold,25);M=ImageFont.truetype(mono,11)
W,H=1200,760
palette=Image.new('P',(1,1));colors=['#f7f9fb','#ffffff','#1e293b','#607086','#087e8b','#406aa8','#94a3b8','#dfe7ed','#e9edf1','#f3b657','#81a8b3','#ffdc99','#116644','#e6f4ee']
vals=[]
for c in colors:vals.extend(tuple(bytes.fromhex(c[1:])))
palette.putpalette(vals+[255]*(768-len(vals)))
for case in data['cases']:
 if len(sys.argv)>1 and case['id'] not in sys.argv[1:]:continue
 frames=[];last=max(m['nfe'] for m in case['methods']);layouts=[];max_row=0
 for method in case['methods']:
  x=y=0;layout=[]
  for i,piece in enumerate(method['tokens'][:method['effective_tokens']]):
   for char in piece:
    if char=='\n':x=0;y+=1;continue
    if x>=52:x=0;y+=1
    layout.append((i,x,y,char));max_row=max(max_row,y)
    x+=1
  layouts.append(layout)
 panel_bottom=max(692,math.ceil(131+126+(max_row+1)*14.0+18))
 H=panel_bottom+68
 for step in range(last+1):
  im=Image.new('RGB',(W,H),'#f7f9fb');d=ImageDraw.Draw(im)
  d.text((24,20),'RPD | Real decoding trajectories',font=T,fill='#087e8b')
  d.text((24,60),f'{case["model"]} · {case["task"]} · Test item {case["doc_id"]}',font=F,fill='#607086')
  d.text((900,28),f'Forward {step:3d} / {last}',font=B,fill='#1e293b')
  if 'prompt_summary' in case:prompt=case['prompt_summary']
  elif case['task']=='GSM8K':prompt='Janet sells the eggs left after eating 3 and using 4 of her 16 eggs. Each sells for $2. What is her daily revenue?'
  else:prompt='Implement has_close_elements: are any two numbers closer to each other than the given threshold?'
  d.text((24,92),prompt,font=F,fill='#1e293b')
  for j,(m,layout) in enumerate(zip(case['methods'],layouts)):
   left=24+j*391;top=131;right=left+369
   d.rounded_rectangle((left,top,right,panel_bottom),radius=8,fill='white',outline='#dfe7ed')
   d.line((left+8,top,right-8,top),fill=['#94a3b8','#406aa8','#087e8b'][j],width=3)
   d.text((left+15,top+17),m['name'],font=B,fill='#1e293b')
   d.text((left+15,top+50),f'Forwards {min(step,m["nfe"])}/{m["nfe"]}   Committed {sum(s<=step for s in m["commit_step"])}/256',font=F,fill='#607086')
   if step>=m['nfe']:d.text((left+279,top+22),'Complete',font=S,fill='#116644')
   for pos,commit in enumerate(m['commit_step']):
    x=left+15+(pos%64)*5.3;y=top+81+(pos//64)*7
    c='#e9edf1' if commit>step else '#f3b657' if commit==step else '#81a8b3'
    d.rectangle((x,y,x+3.6,y+4.5),fill=c)
   for pos,x,y,char in layout:
    xx=left+15+x*6.62;yy=top+126+y*14.0;commit=m['commit_step'][pos]
    if commit>step:
     if not char.isspace():d.rectangle((xx,yy+2,xx+6.5,yy+11),fill='#e9edf1')
    else:
     if commit==step:d.rectangle((xx,yy,xx+6.62,yy+14),fill='#ffdc99')
     d.text((xx,yy),char,font=M,fill='#1e293b')
  d.text((24,panel_bottom+21),'Shared forward index, not wall time. All 256 positions included; terminal tokens hidden from text.',font=F,fill='#607086')
  d.text((24,panel_bottom+46),'dlm-rpd.github.io · arXiv:2609.36452 · Shown prompts summarized; exact prompts available in the repository.',font=S,fill='#607086')
  frames.append(im.quantize(palette=palette,dither=Image.Dither.NONE))
 out=root/'static/videos'/f'{case["id"]}.gif';out.parent.mkdir(exist_ok=True)
 frames[0].save(out,save_all=True,append_images=frames[1:],duration=[750]+[80]*(len(frames)-2)+[2000],loop=0,optimize=True,disposal=1)
 print(out.name,len(frames),'frames',out.stat().st_size,flush=True)
