const createCanvas = (width,height) =>{
  let canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  return canvas;
}

const loadImage = (src,i,onLoad) => {
  return new Promise((resolve,reject)=>{
    if(typeof src=="string"){
      src={
        name:"image"+i,
        src,
      };
    }

    let img=new Image();
    src.img=img;
    img.addEventListener("load",(event)=>{
      if(typeof onLoad=="function"){
        onLoad.call(null,img,i);
      }
      resolve(src);
    });
    img.src=src.src;
  })
}

const loadImages = (images,onLoad) => {
  return Promise.all(images.map((src,i)=>{
    return loadImage(src,i,onLoad);
  }));
}

const ImageLoader = (images,onLoad) => {
  return new Promise((resolve,reject)=>{
    loadImages(images,onLoad).then((loadedImages)=>{
      let r={};
      loadedImages.forEach((curImage)=>{
        r[curImage.name]={
          img:curImage.img,
          src:curImage.src,
        };
      })
      
      resolve(r);
    });
  })
}

const random = (from=null,to=null,interpolation=null) => {
  if(from==null){
    from=0;
    to=1;
  }else if(from!=null && to==null){
    to=from;
    from=0;
  }
  const delta=to-from;

  if(interpolation==null){
    interpolation=(n)=>{
      return n;
    }
  }
  return from+(interpolation(Math.random())*delta);
}

const chance = (c) => {
  return random()<=c;
}

const times = (n,f) => {
  for (let i = 0; i < n; i++) {
    f.call(this,i);
  }
}

export {createCanvas,ImageLoader,loadImages, random,chance,times}
