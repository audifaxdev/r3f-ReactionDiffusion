import {shaderMaterial} from "@react-three/drei";
import * as THREE from "three";

const ReactionDiffusionShader = shaderMaterial(
  {
    debugUVTxt: { value: null },
    textTexture: { value: null },
    bufferTexture: { value: null },
    res: { value: new THREE.Vector2(0, 0) },
    iTime: 0,
    iTimeDelta: 0,
  },
  // vertex shader
  /*glsl*/ `
    varying vec2 vUv;
    void main () {
        vUv =uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
  // fragment shader
  /*glsl*/ `
    #define DEBUG 0
  
    uniform float iTimeDelta;//The width and height of our screen
    uniform float iTime;//The width and height of our screen
    uniform vec2 res;//The width and height of our screen
    uniform sampler2D bufferTexture;//Our input texture
    uniform sampler2D textTexture;//Our text texture
    uniform sampler2D debugUVTxt;
    varying vec2 vUv;
    
    const vec2 DiffusionRate = vec2(1.0, 0.5);
    // const float KillRate = 0.05833;
    // const float FeedRate = 0.03457;
    const float KillRate = 0.062;
const float FeedRate = 0.0545;
    const float Speed = 40.0;
    
    vec2 center = vec2(0.5, 0.5);
    float radius = .25;
    const float thickness = .015;
    
    // vec3 iResolution = vec3(res, 2.);
    
    vec2 computeLaplacian(vec2 uv, vec2 current)
    {
        vec3 iResolution = vec3(res, 2.);
    
        vec2 pixelSize = vec2(1.) / res;
        
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
      
      vec4 txt = texture(textTexture, uv);
  
      if (iTime < .5) {
        // vec2 toMid = (res * .5  - fragCoord) / res.y;
        // toMid += sin(atan(toMid.x, toMid.y)*20.0) * 0.02; // Wobble circle a bit to get the desired effects faster.
        // float midDistSq = dot(toMid, toMid);
        // float initVal = pow(sin(midDistSq * 40.0) * 0.5 + 0.5, 5.0);
        // gl_FragColor = vec4(1.0, initVal, 0.0, 1.0);
        
        gl_FragColor = txt;
        // gl_FragColor = vec4(vec3(1.-text), 1.);
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
      
      float outline = txt.g;
      float fill = txt.r;
      // float r = max(newValues.g, txt.g);
      // float g = max(newValues.g, txt.g);
      // gl_FragColor = vec4(vec2(r, g), 0.0, 1.0);
      
      
      gl_FragColor = vec4(newValues, 0.0, 1.0);
      
      // gl_FragColor = max( vec4(fill, .5*fill, 0., 1.), vec4(newValues, 0.0, 1.0) );
      
    }
  `
);

export default ReactionDiffusionShader;