import * as THREE from '../../build/three.module.js';
import { DropletManager } from './droplet_manager.js';
import {loadImages} from './utils.js'

export const CameraWaterDrop = (_options) => {
	const options = {
		dropAlphaImage:{
			name:'dropAlpha',
			src:'./libs/CameraWaterDrop/images/drop-alpha.png'
		},
		dropColorImage:{
			name:'dropColor',
			src:'./libs/CameraWaterDrop/images/drop-color.png'
		},
		shineImage:{
			name:'shine',
			src:'./libs/CameraWaterDrop/images/drop-shine2.png'
		},
		width:1280,
		height:720
	}

	Object.assign(options, _options);

	let plane;
	let camera, scene, renderer;
	let copyMaterial, blurMaterial, waterMaterial;
	let dropMgr, dropColor, dropAlpha;
	let dropTexture;
	let parallax={x:0,y:0};
	let copyRTT, blurRTT;

	const initDrop = () => {
		let dpi=window.devicePixelRatio;

		dropMgr = DropletManager( 
			options.width,
			options.height,
		    dpi,
		    dropAlpha,
		    dropColor,{
		      	trailRate:1,
		      	trailScaleRange:[0.2,0.45],
		      	collisionRadius : 0.45,
		      	dropletsCleaningRadiusMultiplier : 0.28,
		    }
		);

		dropMgr.init();

		const data= {
			rainChance:0,
			rainLimit:0,
			droplets:0,
			raining:false,
		}

		dropMgr.setOptions(data);
		dropMgr.clearDrops();

		dropTexture = new THREE.Texture(dropMgr.getCanvas());
		dropTexture.needsUpdate= true;
	};

	const initRTT = () => {
		var pixelRatio = renderer.getPixelRatio();

		const rttParameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBFormat,
			stencilBuffer: true
		};

		copyRTT = new THREE.WebGLRenderTarget(
			window.innerWidth * pixelRatio,
			window.innerHeight * pixelRatio,
			rttParameters
		);

		blurRTT = new THREE.WebGLRenderTarget(
			window.innerWidth * pixelRatio,
			window.innerHeight * pixelRatio,
			rttParameters
		);
	};

	const initMaterials = () => {
		blurMaterial = new THREE.ShaderMaterial({
	    	uniforms:{
	    		uTexture:{type:'t', value:blurRTT.texture},
	    		uResolution:{type:'v2', value:new THREE.Vector2(innerWidth, innerHeight)}
	    	},
	    	vertexShader:`
	    		varying vec2 vUv;

	    		void main(){
	    			vUv = uv;

	    			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	    		}
	    	`,
	    	fragmentShader:`
	    		varying vec2 vUv;

	    		uniform sampler2D uTexture;
	    		uniform vec2 uResolution;

	    		const int samples = 20;

				const int LOD = 1,         // gaussian done on MIPmap at scale LOD
				sLOD = 1 << LOD; // tile size = 2^LOD


				float gaussian(vec2 i) {
					float sigma = float(samples) * .25;
				  	return exp( -.5* dot(i/=sigma,i) ) / ( 6.28 * sigma*sigma );
				}

				vec4 blur(sampler2D sp, vec2 U, vec2 scale) {
				  	
				    vec2 uv_flip = U;
				    uv_flip.x = 1. - U.x; 

				    vec4 O = vec4(0);  
				    int s = samples/sLOD;
				  
				    for ( int i = 0; i < s*s; i++ ) {
				        vec2 d = vec2(i%s, i/s)*float(sLOD) - float(samples)/2.;
				        O += gaussian(d) * textureLod( sp, U + scale * d , float(LOD) );
				    }
				  
				   
				    return O / O.a;
				}

	    		void main(){
	    			vec2 uv = gl_FragCoord.xy/uResolution.xy;
	    			gl_FragColor = blur(uTexture, uv, 1./uResolution.xy);
	    		}
	    	`
	    });

	    copyMaterial = new THREE.ShaderMaterial({
			uniforms:{
				uTexture:{
					type:'t', 
					value:null
				},
		    	uResolution:{
		    		type:'v2', 
		    		value:new THREE.Vector2(innerWidth, innerHeight)
		    	}
			},
			vertexShader:`
				varying vec2 vUv;

	    		void main(){
	    			vUv = uv;

	    			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	    		}
			`,
			fragmentShader:`
				varying vec2 vUv;

	    		uniform sampler2D uTexture;
	    		uniform vec2 uResolution;

	    		void main(){
	    			gl_FragColor = texture2D(uTexture, vUv);
	    		}
			`
		});

		waterMaterial = new THREE.ShaderMaterial({
			uniforms:{
				u_resolution: {
			    	type: 'v2',
			      	value: new THREE.Vector2(innerWidth, innerHeight)
			    },
			    u_parallax: {
			      type: 'v2',
			      value: new THREE.Vector2(1, 1)
			    },
			    u_waterMap: {
			      type: 'sampler2D',
			      value: null,
			    },
			    u_textureFg: {
			      type: 'sampler2D',
			      value: null,
			    },
			    u_textureBg: {
			      type: 'sampler2D',
			      value: null,
			    },
			    u_textureShine: {
			      type: 'sampler2D',
			      value: new THREE.TextureLoader().load(options.shineImage.src),
			    },
			    u_parallaxFg:{
			    	type:'f',
			    	value:5
			    },
			    u_parallaxBg:{
			    	type:'f',
			    	value:20
			    },
			    u_textureRatio:{
			    	type:'f',
			    	value:1
			    },
			    u_renderShine:{
			    	type:'b',
			    	value:true
			    },
			    u_renderShadow:{
			    	type:'b',
			    	value:false
			    },
			    u_minRefraction:{
			    	type:'f',
			    	value:256
			    },
			    u_refractionDelta:{
			    	type:'f',
			    	value:512
			    },
			    u_brightness:{
			    	type:'f',
			    	value:1.04
			    },
			    u_alphaMultiply:{
			    	type:'f',
			    	value:6
			    },
			    u_alphaSubtract:{
			    	type:'f',
			    	value:3	
			    }
			},
			vertexShader:`
				varying vec2 vTextureCoord;

	    		void main(){

	    			vTextureCoord = uv;

	    			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	    		}
			`,
			fragmentShader:`
				precision mediump float;

				// textures
				uniform sampler2D u_waterMap;
				uniform sampler2D u_textureShine;
				uniform sampler2D u_textureFg;
				uniform sampler2D u_textureBg;

				// the texCoords passed in from the vertex shader.
				varying vec2 v_texCoord;
				uniform vec2 u_resolution;
				uniform vec2 u_parallax;
				uniform float u_parallaxFg;
				uniform float u_parallaxBg;
				uniform float u_textureRatio;
				uniform bool u_renderShine;
				uniform bool u_renderShadow;
				uniform float u_minRefraction;
				uniform float u_refractionDelta;
				uniform float u_brightness;
				uniform float u_alphaMultiply;
				uniform float u_alphaSubtract;

				// alpha-blends two colors
				vec4 blend(vec4 bg,vec4 fg){
				  vec3 bgm=bg.rgb*bg.a;
				  vec3 fgm=fg.rgb*fg.a;
				  float ia=1.0-fg.a;
				  float a=(fg.a + bg.a * ia);
				  vec3 rgb;
				  if(a!=0.0){
				    rgb=(fgm + bgm * ia) / a;
				  }else{
				    rgb=vec3(0.0,0.0,0.0);
				  }
				  return vec4(rgb,a);
				}

				vec2 pixel(){
				  return vec2(1.0,1.0)/u_resolution;
				}

				vec2 parallax(float v){
				  return u_parallax*pixel()*v;
				}

				vec2 texCoord(){
				  return gl_FragCoord.xy / u_resolution;//vec2(gl_FragCoord.x, u_resolution.y-gl_FragCoord.y)/u_resolution;
				}

				// scales the bg up and proportionally to fill the container
				vec2 scaledTexCoord(){
				  float ratio=u_resolution.x/u_resolution.y;
				  vec2 scale=vec2(1.0,1.0);
				  vec2 offset=vec2(0.0,0.0);
				  float ratioDelta=ratio-u_textureRatio;
				  if(ratioDelta>=0.0){
				    scale.y=(1.0+ratioDelta);
				    offset.y=ratioDelta/2.0;
				  }else{
				    scale.x=(1.0-ratioDelta);
				    offset.x=-ratioDelta/2.0;
				  }
				  return (texCoord()+offset)/scale;
				}

				// get color from fg
				vec4 fgColor(float x, float y){
				  float p2=u_parallaxFg*2.0;
				  vec2 scale=vec2(
				    (u_resolution.x+p2)/u_resolution.x,
				    (u_resolution.y+p2)/u_resolution.y
				  );

				  vec2 scaledTexCoord=texCoord()/scale;
				  vec2 offset=vec2(
				    (1.0-(1.0/scale.x))/2.0,
				    (1.0-(1.0/scale.y))/2.0
				  );

				  return texture2D(u_waterMap,
				    (scaledTexCoord+offset)+(pixel()*vec2(x,y))+parallax(u_parallaxFg)
				  );
				}

				void main() {
				  vec4 bg=texture2D(u_textureBg,scaledTexCoord()+parallax(u_parallaxBg));

				  vec4 cur = fgColor(0.0,0.0);

				  float d=cur.b; // "thickness"
				  float x=cur.g;
				  float y=cur.r;

				  float a=clamp(cur.a*u_alphaMultiply-u_alphaSubtract, 0.0,1.0);

				  vec2 refraction = (vec2(x,y)-0.5)*2.0;
				  vec2 refractionParallax=parallax(u_parallaxBg-u_parallaxFg);
				  vec2 refractionPos = scaledTexCoord()
				    + (pixel()*refraction*(u_minRefraction+(d*u_refractionDelta)))
				    + refractionParallax;

				  vec4 tex=texture2D(u_textureFg,refractionPos);

				  if(u_renderShine){
				    float maxShine=490.0;
				    float minShine=maxShine*0.18;
				    vec2 shinePos=vec2(0.5,0.5) + ((1.0/512.0)*refraction)* -(minShine+((maxShine-minShine)*d));
				    vec4 shine=texture2D(u_textureShine,shinePos);
				    tex=blend(tex,shine);
				  }

				  vec4 fg=vec4(tex.rgb*u_brightness,a);

				  if(u_renderShadow){
				    float borderAlpha = fgColor(0.,0.-(d*6.0)).a;
				    borderAlpha=borderAlpha*u_alphaMultiply-(u_alphaSubtract+0.5);
				    borderAlpha=clamp(borderAlpha,0.,1.);
				    borderAlpha*=0.2;
				    vec4 border=vec4(0.,0.,0.,borderAlpha);
				    fg=blend(border,fg);
				  }

				  gl_FragColor = blend(bg,fg);
				}

			`
		});
	};

	const initCameraPlane = () => {
		let ang_rad = camera.fov * Math.PI / 180;
		let fov_y = camera.position.z * Math.tan(ang_rad / 2) * 2;
		var planeGeometry = new THREE.PlaneGeometry(fov_y * camera.aspect, fov_y);
		
		plane = new THREE.Mesh(planeGeometry, copyMaterial);

		plane.position.x = 0;
		plane.position.y = 0;
		plane.position.z = 0;

		plane.rotateZ(-Math.PI);
		scene.add(plane);
	};

	const base = {
		init:async(_camera, _scene, _renderer) => {
			camera = _camera;
			scene = _scene;
			renderer = _renderer;

			const images = await loadImages([
    			options.dropAlphaImage,
    			options.dropColorImage
    		]);

			console.log(images)
			dropColor = images[1].img;
			dropAlpha = images[0].img;

			initRTT();
			initMaterials();
			initCameraPlane();	
			initDrop();
			
			
		},
		update:(renderer, delta, objs) => {
			plane.visible=false;

			objs.map(obj => {
				obj.visible = true;
			})
			
			renderer.setRenderTarget(copyRTT);
			renderer.render(scene, camera);
			renderer.setRenderTarget(null);

			plane.visible=true;
			plane.material = blurMaterial;
			plane.material.uniforms.uTexture.value = copyRTT.texture;
			
			objs.map(obj => {
				obj.visible = false;
			})

			renderer.setRenderTarget(blurRTT);
			renderer.render(scene, camera);
			renderer.setRenderTarget(null);

			plane.material = waterMaterial;

			plane.material.uniforms.u_textureFg.value = blurRTT.texture;
			plane.material.uniforms.u_textureBg.value = copyRTT.texture;

			dropTexture.needsUpdate = true;
			plane.material.uniforms.u_waterMap.value = dropTexture;
		},
		splashScreen:() => {
			const splashData = {
				minR:10,
				maxR:40,
				rainChance:1.25,
				rainLimit:3,
				dropletsRate:10,
				dropletsSize:[3.5,6],
				raining:true,
			};

			dropMgr.setOptions(splashData);
			dropMgr.clearDrops();

			setTimeout(() => {
				const dryData= {
					rainChance:0,
					rainLimit:0,
					droplets:0,
					raining:false,
				}

				dropMgr.setOptions(dryData);
				dropMgr.clearDrops();

			},2000);
		}
	};

	return base;

}