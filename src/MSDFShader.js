import {DoubleSide, RawShaderMaterial, Vector2} from "three";
import { Texture, Color, GLSL3 } from 'three'

class MSDFShader extends RawShaderMaterial {
  constructor(opt) {
    opt = opt || {}
    let opacity = typeof opt.opacity === 'number' ? opt.opacity : 1
    let color = opt.color
    let map = opt.map
    let gradMap = opt.gradMap
    // remove to satisfy r73
    delete opt.map
    delete opt.gradMap
    delete opt.color
    delete opt.precision
    delete opt.opacity
    delete opt.negate

    super( Object.assign({
      glslVersion: GLSL3,
      side: DoubleSide,
      uniforms: {
        opacity: { type: 'f', value: opacity },
        map: { type: 't', value: map || new Texture() },
        gradMap: { type: 't', value: gradMap || new Texture() },
        color: { type: 'c', value: new Color(color) },
        time: {type: 'f', value: 0},
        mouseC: {type: 'v2', value: new Vector2()},
        viewport: {type: 'v2', value: new Vector2(window.innerWidth*devicePixelRatio, window.innerHeight*devicePixelRatio)},
        devicePixelRatio: {type: 'i', value: devicePixelRatio}
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
        
        uniform float time;
        uniform float opacity;
        uniform vec3 color;
        uniform sampler2D map;
        uniform sampler2D gradMap;
        uniform vec2 mouseC;
        uniform vec2 viewport;
        uniform int devicePixelRatio;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        #define gl_FragColor fragColor
        
        float median(float r, float g, float b) {
            return max(min(r, g), min(max(r, g), b));
        }
        
        float makeCircle() {
          vec2 viewportUV = gl_FragCoord.xy / viewport;
          float viewportAspect = viewport.x / viewport.y;
          
          vec2 mousePoint = vec2(mouseC.x, 1. - mouseC.y);
          float circleRadius = max(0.0, 100.*float(devicePixelRatio) / viewport.x);
          
          vec2 shapeUv = viewportUV - mousePoint;
          shapeUv /= vec2(1.0, viewportAspect);
          shapeUv += mousePoint;
          
          float dist = distance(shapeUv, mousePoint);
          dist = smoothstep(circleRadius, circleRadius + 0.001, dist);
          return dist;
         }

        void main() {
          float width = .1;
          float lineProgress = .5;
          vec3 s = texture(map, vUv).rgb;
          float gr = texture(gradMap, vUv).r;
          float sigDist = median(s.r, s.g, s.b) - 0.5;
          float fill = clamp((sigDist/fwidth(sigDist)) + 0.5, 0.0, 1.0);
          
          //stroke
          float border = fwidth(sigDist);
          float inside = smoothstep(0., border, sigDist);
          float outside = 1. - smoothstep(width-border, width, sigDist);
          float outline = inside * outside;
          
          //gradient
          // float grgr = fract(3.*gr + time/50.);
          // float start = smoothstep(0., .0000001, grgr);
          // float end = smoothstep(lineProgress, lineProgress-.001, grgr);
          // float mask = start*end;
          // mask = max(.2, mask);
          
          // float finalAlpha = outline*inside*mask+fill*makeCircle() * 0.;
          
          // fragColor = vec4(outline, inside, 0.,  finalAlpha);
          fragColor = vec4(vec3(fill, outline, 0.),  fill);
          
          // if (fragColor.a < .001) discard;
          // fragColor = vec4(vec3(inside), 1.);
          
          // fragColor = vec4(1., .5, 0., 1.);
        }
      `
    }, opt));
  }
}

export default MSDFShader;