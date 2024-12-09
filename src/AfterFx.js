import {shaderMaterial} from "@react-three/drei";
import * as THREE from "three";

const AfterFx = shaderMaterial(
  {
    res: { value: new THREE.Vector2(0, 0) },
    mouseC: { value: null },
    bufferTexture: { value: null },
    txtTexture: { value: null },
  },
  // vertex shader
  /*glsl*/ `
    uniform vec2 res;
    varying vec2 vUv;
    void main () {
        vUv=uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
  // fragment shader
  /*glsl*/ `
    uniform vec2 res;//The width and height of our screen
    uniform vec2 mouseC;
    uniform sampler2D bufferTexture;
    uniform sampler2D txtTexture;
    varying vec2 vUv;
    
    float makeCircle() {
      float devicePixelRatio = 2.;
      vec2 viewportUV = gl_FragCoord.xy / res.xy;
      float viewportAspect = res.x / res.y;

      vec2 mousePoint = vec2(mouseC.x, mouseC.y);
      float circleRadius = max(0.0, 100.*float(devicePixelRatio) / res.x);

      vec2 shapeUv = viewportUV - mousePoint;
      shapeUv /= vec2(1.0, viewportAspect);
      shapeUv += mousePoint;

      float dist = distance(shapeUv, mousePoint);
      dist = smoothstep(circleRadius, circleRadius + 0.001, dist);
      return dist;
     }
     
    void main() {
      vec2 uv = vUv;
      vec4 txt = texture(txtTexture, uv);
      vec4 dValues = texture(bufferTexture, uv);
      vec2 values = dValues.xy;
      float displayedValue = values.x;
      const float edginess = 20.0;
      float sigmoid = 1.0 / (1.0+exp(-displayedValue * edginess + edginess * 0.5));
      // gl_FragColor = vec4(1.-sigmoid);
      // gl_FragColor = dValues;
      vec4 trippy = vec4(vec3(1.-sigmoid), dValues.a);
      gl_FragColor = mix(vec4(vec3(txt.r), dValues.a), trippy, makeCircle());
      // gl_FragColor = trippy;
    }
  `
);

export default AfterFx;