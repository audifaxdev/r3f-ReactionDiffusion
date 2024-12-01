import "./styles.css";
import {useControls, button} from 'leva';
import { useRef, useCallback, useState, forwardRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  createPortal,
  extend
} from "@react-three/fiber";
import {
  OrthographicCamera,
  useFBO,
  shaderMaterial,
  useTexture,
  PerspectiveCamera
} from "@react-three/drei";
import * as THREE from "three";
import {Clock} from 'three';
import {TextGeometry as BMFTextGeometry} from "three-bmfont-text-es/";

// const size = {
//   width: window.innerWidth,
//   height: window.innerHeight
// }

const OffScreenMaterial = shaderMaterial(
  {
    debugUVTxt: { value: null },
    bufferTexture: { value: null },
    res: { value: new THREE.Vector2(0, 0) },
    iTime: 0,
    iTimeDelta: 0,
    smokeSource: { value: new THREE.Vector3(0, 0, 0) }
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
    uniform sampler2D debugUVTxt;
    varying vec2 vUv;
    
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

        gl_FragColor = vec4(1.0, initVal, 0.0, 1.0);
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
      
      
      gl_FragColor = vec4(newValues, 0.0, 1.0);
    }
  `
);

extend({ OffScreenMaterial });

const OffScreenScene = forwardRef(function OffScreenScene(props, ref) {
  const { visible } = props;
  const { size } = useThree();
  const offscreenMat = useRef(null);
  const debugUVTxt =  useTexture("/uvdebugtiles.png");
  const clock = new Clock();
  clock.stop();
  useFrame(() => {
/*    if (!clock.running) {
      clock.start();
    }*/
    if (offscreenMat.current) {
      // console.log('offscreenMat.current.uniforms', offscreenMat.current.uniforms)
      // console.log('offscreenMat.current.uniforms', {
      //   time: offscreenMat.current.uniforms.iTime.value,
      //   delta: offscreenMat.current.uniforms.iTimeDelta.value
      // });
      offscreenMat.current.uniforms.iTimeDelta.value = clock.getDelta();
      offscreenMat.current.uniforms.iTime.value = clock.getElapsedTime();
    }
  });

  const {} = useControls({
    Start: button(() => {
      clock.start();
    }),
    Stop: button(() => {
      clock.stop();
    }),
  }, [clock]);

  console.log({size})

  return (
    <group visible={visible}>
      <mesh
        position={[0, 0, 0]}
        ref={ref}>
        <planeGeometry args={[size.width, size.height]} />
        <offScreenMaterial
          debugUVTxt={debugUVTxt}
          ref={offscreenMat}
          bufferTexture={props.map}
          res={new THREE.Vector2(size.width/2, size.height/2)}
        />
      </mesh>
    </group>
  );
});

const Plane = () => {
  const { scene, camera, size } = useThree();
  const offScreen = useRef();
  const onScreen = useRef();

  const offScreenFBOTexture = useFBO(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter
  });
  const onScreenFBOTexture = useFBO(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter
  });

  const [offScreenScene] = useState(() => new THREE.Scene());
  const offScreenCameraRef = useRef(null);

  let textureA = offScreenFBOTexture;
  let textureB = onScreenFBOTexture;

  useFrame(({ gl, camera }) => {
    gl.setRenderTarget(textureB);
    gl.render(offScreenScene, offScreenCameraRef.current);

    //Swap textureA and B
    var t = textureA;
    textureA = textureB;
    textureB = t;
    onScreen.current.material.map = textureB.texture;
    offScreen.current.material.uniforms.bufferTexture.value = textureA.texture;

    gl.setRenderTarget(null);
    gl.render(scene, camera);
  });

  const onPointerMove = useCallback((e) => {
    const { uv } = e;

    offScreen.current.material.uniforms.smokeSource.value.x = uv.x;
    offScreen.current.material.uniforms.smokeSource.value.y = uv.y;
  }, []);

  const onMouseUp = useCallback((event) => {
    offScreen.current.material.uniforms.smokeSource.value.z = 0.0;
  }, []);
  const onMouseDown = useCallback((event) => {
    offScreen.current.material.uniforms.smokeSource.value.z = 0.1;
  }, []);

  const aspecRatio = size.width / size.height;
  const invAspecRatio = 1/aspecRatio;
  const distance = 1;

  const planeHeight = 1;
  const fov = 2 * Math.atan((planeHeight / 2) / distance) * (180 / Math.PI);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0,0,1]}
        fov={fov}
        aspect={aspecRatio}
        near={.1}
        far={1000}
      />
      <mesh
        visible={true}
        ref={onScreen}
        onPointerMove={onPointerMove}
        onPointerDown={onMouseDown}
        onPointerUp={onMouseUp}
      >
        <planeGeometry args={[size.width/size.height, 1, 1, 1]} />
        <meshBasicMaterial side={THREE.DoubleSide} map={offScreenFBOTexture} />
      </mesh>

      {createPortal(
        <>
          <OffScreenScene visible={true} ref={offScreen} map={offScreenFBOTexture.texture} />
          <OrthographicCamera
            makeDefault
            position={[0, 0, 10]}
            args={[
              -1, 1, 1, -1, 1, 1000
            ]}
            aspect={size.width / size.height}
            zoom={1}
            ref={offScreenCameraRef}
          />
        </>
      ,
        offScreenScene
      )}
    </>
  );
};

export default function App() {
  return (
    <div className="App">
      <Canvas>
        <Plane />
      </Canvas>
    </div>
  );
}
