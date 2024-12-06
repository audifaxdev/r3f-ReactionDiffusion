import {DoubleSide, RawShaderMaterial, Vector2, Vector3} from "three-stdlib";
import { Texture, Color, GLSL3 } from 'three-stdlib'
import * as THREE from "three-stdlib";

class MSDFShaderPingPong extends RawShaderMaterial {
  constructor(opt) {
    opt = opt || {}
    let opacity = typeof opt.opacity === 'number' ? opt.opacity : 1
    let color = opt.color
    let map = opt.map
    let gradMap = opt.gradMap
    let bufferTexture = opt.bufferTexture
    let res = opt.res;
    let debugUVTxt = opt.debugUVTxt;

    // remove to satisfy r73
    delete opt.map
    delete opt.gradMap
    delete opt.color
    delete opt.precision
    delete opt.opacity
    delete opt.negate
    delete opt.bufferTexture
    delete opt.res
    delete opt.debugUVTxt

    super(Object.assign({
      glslVersion: GLSL3,
      side: DoubleSide,
      uniforms: {
        opacity: { type: 'f', value: opacity },
        color: { type: 'c', value: new Color(color) },
        debugUVTxt: { value: debugUVTxt },
        bufferTexture: { value: bufferTexture },
        res: { value: res },
        iTime: {value: 0},
        iTimeDelta: {value: 0},
      },
      vertexShader: `
        precision highp float;
        precision highp int;
      
        in vec2 uv;
        in vec4 position;
        out vec2 vUv;
        
        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * position;
        }
      `,
      fragmentShader: `
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif

        precision highp float;
        precision highp int;
        #define DEBUG 0
        // #define fragColor gl_FragColor
  
        uniform float iTimeDelta;//The width and height of our screen
        uniform float iTime;//The width and height of our screen
        uniform vec2 res;//The width and height of our screen
        uniform sampler2D bufferTexture;//Our input texture
        uniform sampler2D debugUVTxt;
        in vec2 vUv;
        out vec4 fragColor;
        
        const vec2 DiffusionRate = vec2(1.0, 0.5);
        const float KillRate = 0.05833;
        const float FeedRate = 0.03457;
        const float Speed = 40.0;
        
        vec2 center = vec2(0.5, 0.5);
        float radius = .25;
        const float thickness = .015;
        
        // vec3 iResolution = vec3(res, 2.);
        
        vec2 computeLaplacian(vec2 uv, vec2 current)
        {
            vec3 iResolution = vec3(res, 2.);
        
            vec2 pixelSize = vec2(.5) / res;
            
            // with diagonals.
            return (texture(bufferTexture, uv + vec2(pixelSize.x, 0.0)).xy +
                    texture(bufferTexture, uv - vec2(pixelSize.x, 0.0)).xy +
                    texture(bufferTexture, uv + vec2(0.0, pixelSize.y)).xy +
                    texture(bufferTexture, uv - vec2(0.0, pixelSize.y)).xy) * 0.2
                    +
                   (texture(bufferTexture, uv + pixelSize).xy +
                    texture(bufferTexture, uv - pixelSize).xy +
                    texture(bufferTexture, uv + vec2(pixelSize.x, -pixelSize.y)).xy +
                    texture(bufferTexture, uv - vec2(pixelSize.x, -pixelSize.y)).xy) * 0.05
            -
                    current;
        }
    
        void main() {
          vec3 iResolution = vec3(res, 2.);
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = vUv;
          // gl_FragColor = vec4(vec2(vUv), 0.0, 1.0);
          // return;
      
          if (iTime < 0.1) {
            vec2 toMid = (res - fragCoord) / res.y;
            toMid += sin(atan(toMid.x, toMid.y)*20.0) * 0.02; // Wobble circle a bit to get the desired effects faster.
            float midDistSq = dot(toMid, toMid);
            float initVal = pow(sin(midDistSq * 40.0) * 0.5 + 0.5, 5.0);
    
            fragColor = vec4(1.0, initVal, 0.0, 1.0);
            return;
          }
          
          vec2 current = clamp(texture(bufferTexture, uv).xy, vec2(0.), vec2(1.));
          
          // Compute diffusion.
          vec2 laplacian = computeLaplacian(uv, current);
          vec2 diffusion = DiffusionRate * laplacian;
              
          // Compute reaction.
          float u = current.x;
          float v = current.y;    
          float reactionU = - u * v * v + FeedRate * (1. - u);
          float reactionV = u * v * v - (FeedRate + KillRate) * v;
          
          // Apply using simple forward Euler.
          vec2 newValues = current + (diffusion + vec2(reactionU, reactionV)) * Speed * iTimeDelta;
          
          
          fragColor = vec4(newValues, 0.0, 1.0);
        
        }
      `
    }, opt));
  }
}

export default MSDFShaderPingPong;