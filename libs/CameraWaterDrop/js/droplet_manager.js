import { createCanvas,ImageLoader,random, times, chance } from './utils.js';

export const DropletManager = (_width,_height,_scale,_dropAlpha,_dropColor,_options) => {
	let dropSize=64;
	
	const Drop={
	  x:0,
	  y:0,
	  r:0,
	  spreadX:0,
	  spreadY:0,
	  momentum:0,
	  momentumX:0,
	  lastSpawn:0,
	  nextSpawn:0,
	  parent:null,
	  isNew:true,
	  killed:false,
	  shrink:0,
	}

	const options = {
	  minR:10,
	  maxR:40,
	  maxDrops:900,
	  rainChance:0.3,
	  rainLimit:3,
	  dropletsRate:50,
	  dropletsSize:[2,4],
	  dropletsCleaningRadiusMultiplier:0.43,
	  raining:true,
	  globalTimeScale:1,
	  trailRate:1,
	  autoShrink:true,
	  spawnArea:[-0.1,0.95],
	  trailScaleRange:[0.2,0.5],
	  collisionRadius:0.65,
	  collisionRadiusIncrease:0.01,
	  dropFallMultiplier:1,
	  collisionBoostMultiplier:0.05,
	  collisionBoost:1,
	}
	
	Object.assign(options,_options);

	let dropletsPixelDensity = 1;
	let width=_width;
  	let height=_height;
  	let scale=_scale;
  	let dropAlpha=_dropAlpha;
  	let dropColor=_dropColor;

  	let canvas, ctx;
  	let droplets, dropletsCtx;
  	let clearDropletsGfx;
  	let drops=[];
  	let dropsGfx=[];
  	let textureCleaningIterations = 0;
  	let dropletsCounter=0;
  	let lastRender;

  	const renderDropsGfx = () => {
  		let dropBuffer = createCanvas(dropSize,dropSize);
    	let dropBufferCtx = dropBuffer.getContext('2d');
    	
    	dropsGfx=Array.apply(null,Array(255)).map((cur,i)=>{
        	let drop = createCanvas(dropSize,dropSize);
        	let dropCtx=drop.getContext('2d');
        	dropBufferCtx.clearRect(0,0,dropSize,dropSize);

        	// color
        	dropBufferCtx.globalCompositeOperation="source-over";
        	dropBufferCtx.drawImage(dropColor,0,0,dropSize,dropSize);

        	// blue overlay, for depth
        	dropBufferCtx.globalCompositeOperation="screen";
        	dropBufferCtx.fillStyle="rgba(0,0,"+i+",1)";
        	dropBufferCtx.fillRect(0,0,dropSize,dropSize);

        	// alpha
        	dropCtx.globalCompositeOperation="source-over";
        	dropCtx.drawImage(dropAlpha,0,0,dropSize,dropSize);

        	dropCtx.globalCompositeOperation="source-in";
        	dropCtx.drawImage(dropBuffer,0,0,dropSize,dropSize);
        	
        	return drop;
    	});

    	// create circle that will be used as a brush to remove droplets
    	clearDropletsGfx=createCanvas(128,128);
    	let clearDropletsCtx=clearDropletsGfx.getContext("2d");
    	clearDropletsCtx.fillStyle="#000";
    	clearDropletsCtx.beginPath();
    	clearDropletsCtx.arc(64,64,64,0,Math.PI*2);
    	clearDropletsCtx.fill();
  	};

  	const drawDrop = (ctx, drop) => {
	    if(dropsGfx.length>0){
	      	let x=drop.x;
	      	let y=drop.y;
	      	let r=drop.r;
	      	let spreadX=drop.spreadX;
	      	let spreadY=drop.spreadY;

	      	let scaleX=1;
	      	let scaleY=1.5;

	      	let d=Math.max(0,Math.min(1,((r-options.minR)/(getDeltaR()))*0.9));
	      	d*=1/(((drop.spreadX+drop.spreadY)*0.5)+1);

	      	ctx.globalAlpha=1;
	      	ctx.globalCompositeOperation="source-over";

	      	d=Math.floor(d*(dropsGfx.length-1));
	      	ctx.drawImage(
	        	dropsGfx[d],
	        	(x-(r*scaleX*(spreadX+1)))*scale,
	        	(y-(r*scaleY*(spreadY+1)))*scale,
	        	(r*2*scaleX*(spreadX+1))*scale,
	        	(r*2*scaleY*(spreadY+1))*scale
	      	);
	    }
	};

	const clearDroplets = (x,y,r=30) => {
	    let ctx=dropletsCtx;
	    ctx.globalCompositeOperation="destination-out";
	    ctx.drawImage(
	      clearDropletsGfx,
	      (x-r)*dropletsPixelDensity*scale,
	      (y-r)*dropletsPixelDensity*scale,
	      (r*2)*dropletsPixelDensity*scale,
	      (r*2)*dropletsPixelDensity*scale*1.5
	    )
  	};

  	const clearCanvas = () => {

    	ctx.clearRect(0,0,width,height);
  	};

  	const createDrop = (opts) => {
    	if(drops.length >= options.maxDrops*getAreaMultiplier()) return null;

    	return Object.assign(Object.create(Drop), opts);
  	};

  	const addDrop = (drop) => {
    	if(drops.length >= options.maxDrops*areaMultiplier || drop==null) return false;

    	drops.push(drop);
    	return true;
  	};

  	const updateRain = (timeScale) => {
    	let rainDrops=[];
    	if(options.raining){
      		let limit=options.rainLimit*timeScale*getAreaMultiplier();
      		let count=0;
      		
      		while(chance(options.rainChance*timeScale*getAreaMultiplier()) && count<limit){
        		count++;
        		let r=random(options.minR,options.maxR,(n)=>{
          			return Math.pow(n,3);
        		});
        		
        		let rainDrop=createDrop({
          			x:random(width/scale),
          			y:random((height/scale)*options.spawnArea[0],(height/scale)*options.spawnArea[1]),
          			r:r,
          			momentum:1+((r-options.minR)*0.1)+random(2),
          			spreadX:1.5,
          			spreadY:1.5,
        		});

        		if(rainDrop!=null){
          			rainDrops.push(rainDrop);
        		}
      		}
    	}
    	
    	return rainDrops;
  	};

  	const clearDrops = () => {
    	drops.forEach((drop)=>{
      		setTimeout(()=>{
        		drop.shrink=0.1+(random(0.5));
      		},random(1200))
    	})
    
    	clearTexture();
  	};

  	const clearTexture = () => {
    	textureCleaningIterations=50;
  	};
  
  	const updateDroplets = (timeScale) => {
    	if(textureCleaningIterations>0){
      		textureCleaningIterations-=1*timeScale;
      		dropletsCtx.globalCompositeOperation="destination-out";
      		dropletsCtx.fillStyle="rgba(0,0,0,"+(0.05*timeScale)+")";
      		dropletsCtx.fillRect(0,0,width*dropletsPixelDensity,height*dropletsPixelDensity);
    	}
    
    	if(options.raining){
      		dropletsCounter+=options.dropletsRate*timeScale*getAreaMultiplier();
      		
      		times(dropletsCounter,(i)=>{
        		dropletsCounter--;
        		drawDroplet(
          			random(width/scale),
          			random(height/scale),
          			random(...options.dropletsSize,(n)=>{
            			return n*n;
          			})
        		)
      		});
    	}
    
    	ctx.drawImage(droplets,0,0,width,height);
  	};

  	const updateDrops = (timeScale) => {
    		let newDrops=[];

	    	updateDroplets(timeScale);
	    	let rainDrops=updateRain(timeScale);
	    	newDrops=newDrops.concat(rainDrops);

	    	drops.sort( (a,b) => {
	      		let va=(a.y*(width/scale))+a.x;
	      		let vb=(b.y*(width/scale))+b.x;
	      		
	      		return va>vb?1:va==vb?0:-1;
	    	});

    		drops.forEach((drop,i) => {
      			if(!drop.killed){
        			// update gravity
        			// (chance of drops "creeping down")
        			if(chance((drop.r-(options.minR*options.dropFallMultiplier)) * (0.1/getDeltaR()) * timeScale)){
          				drop.momentum += random((drop.r/options.maxR)*4);
        			}
        			// clean small drops
        			if(options.autoShrink && drop.r<=options.minR && chance(0.05*timeScale)){
          				drop.shrink+=0.01;
        			}
        			//update shrinkage
        			drop.r -= drop.shrink*timeScale;
        			if(drop.r<=0) drop.killed=true;

        			// update trails
	        		if(options.raining){
	          			drop.lastSpawn+=drop.momentum*timeScale*options.trailRate;
	          			if(drop.lastSpawn>drop.nextSpawn){
	            			let trailDrop=createDrop({
	              				x:drop.x+(random(-drop.r,drop.r)*0.1),
	              				y:drop.y-(drop.r*0.01),
	              				r:drop.r*random(...options.trailScaleRange),
	              				spreadY:drop.momentum*0.1,
	              				parent:drop,
	            			});

	            			if(trailDrop!=null){
	              				newDrops.push(trailDrop);

	              				drop.r*=Math.pow(0.97,timeScale);
	              				drop.lastSpawn=0;
	              				drop.nextSpawn=random(options.minR,options.maxR)-(drop.momentum*2*options.trailRate)+(options.maxR-drop.r);
	            			}
	          			}
	        		}

        			//normalize spread
        			drop.spreadX*=Math.pow(0.4,timeScale);
        			drop.spreadY*=Math.pow(0.7,timeScale);

        			//update position
        			let moved=drop.momentum>0;
        			if(moved && !drop.killed){
          				drop.y+=drop.momentum*options.globalTimeScale;
          				drop.x+=drop.momentumX*options.globalTimeScale;
          
          				if(drop.y>(height/scale)+drop.r){
            				drop.killed=true;
          				}
        			}

        			// collision
        			let checkCollision=(moved || drop.isNew) && !drop.killed;
        			drop.isNew=false;

        			if(checkCollision){
          				drops.slice(i+1,i+70).forEach((drop2)=>{
            			//basic check
            			if( drop != drop2 && drop.r > drop2.r && drop.parent != drop2 && drop2.parent != drop && !drop2.killed){
	              			let dx=drop2.x-drop.x;
	              			let dy=drop2.y-drop.y;
	              			var d=Math.sqrt((dx*dx)+(dy*dy));
	              			//if it's within acceptable distance
              				if(d<(drop.r+drop2.r)*(options.collisionRadius+(drop.momentum*options.collisionRadiusIncrease*timeScale))){
				                let pi=Math.PI;
				                let r1=drop.r;
				                let r2=drop2.r;
				                let a1=pi*(r1*r1);
				                let a2=pi*(r2*r2);
				                let targetR=Math.sqrt((a1+(a2*0.8))/pi);
                			
	                			if(targetR>options.maxR){
	                  				targetR=options.maxR;
	                			}

				                drop.r=targetR;
				                drop.momentumX+=dx*0.1;
				                drop.spreadX=0;
				                drop.spreadY=0;
				                drop2.killed=true;
				                drop.momentum=Math.max(drop2.momentum,Math.min(40,drop.momentum+(targetR*options.collisionBoostMultiplier)+options.collisionBoost));
              				}
            			}
          			});
        		}

        		//slowdown momentum
        		drop.momentum-=Math.max(1,(options.minR*0.5)-drop.momentum)*0.1*timeScale;
        		if(drop.momentum<0) drop.momentum=0;
        		drop.momentumX*=Math.pow(0.7,timeScale);


        		if(!drop.killed){
          			newDrops.push(drop);
          	
          			if(moved && options.dropletsRate>0) clearDroplets(drop.x,drop.y,drop.r*options.dropletsCleaningRadiusMultiplier);
          			drawDrop(ctx, drop);
        		}
      		}
    	});

    	drops = newDrops;
  	};

  	const getDeltaR = () => {
		return options.maxR-options.minR;
	}


	const getArea = () => {
		return (width*height)/scale;
	}

	const getAreaMultiplier = () => {
		return Math.sqrt(getArea()/(1024*768));
	}

  	const update = () => {
  		clearCanvas();

    	let now=Date.now();
    	if(lastRender==null) lastRender=now;
    	let deltaT=now-lastRender;
    	let timeScale=deltaT/((1/60)*1000);
    	if(timeScale>1.1) timeScale=1.1;
    	timeScale*=options.globalTimeScale;
    	lastRender=now;

    	updateDrops(timeScale);

    	requestAnimationFrame(update);
  	};

  	const drawDroplet = (x,y,r) => {
	    drawDrop(dropletsCtx, Object.assign(Object.create(Drop),{
	      	x:x*dropletsPixelDensity,
	      	y:y*dropletsPixelDensity,
	      	r:r*dropletsPixelDensity
	    }));
	};

	

	const base = {
		init:() => {
			canvas = createCanvas(width, height);
    		ctx = canvas.getContext('2d');

    		droplets = createCanvas(width*dropletsPixelDensity,height*dropletsPixelDensity);
    		dropletsCtx = droplets.getContext('2d');

    		renderDropsGfx();
    		update();
		},
		getCanvas: () => {
			return canvas;
		},
		setOptions: (_options) => {
			Object.assign(options, _options);
		},
		clearDrops
	}


	return base;
}