import "./styles.css";
import { useRef, useCallback, useState, forwardRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  createPortal,
  extend
} from "@react-three/fiber";
import {OrthographicCamera, useFBO, shaderMaterial, useTexture, PerspectiveCamera} from "@react-three/drei";
import * as THREE from "three";

const OffScreenMaterial = shaderMaterial(
  {
    debugUVTxt: { value: null },
    bufferTexture: { value: null },
    res: { value: new THREE.Vector2(0, 0) },
    time: 0,
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
  
  
    uniform float time;//The width and height of our screen
    uniform vec2 res;//The width and height of our screen
    uniform sampler2D bufferTexture;//Our input texture
    uniform sampler2D debugUVTxt;
    uniform vec3 smokeSource;//The x,y are the posiiton. The z is the power/density
    varying vec2 vUv;

    void main() {
      vec2 pixel = vUv;
      gl_FragColor = texture2D( bufferTexture, gl_FragCoord.xy / res.xy );

      //Get the distance of the current pixel from the smoke source
      float dist = distance(pixel * res.xy, smokeSource.xy * res.xy);

      gl_FragColor.rgb += smokeSource.z * max(10.0 - dist, 0.0) ;

      //Smoke diffuse
      vec4 rightColor = texture2D(bufferTexture,vec2(pixel.x + 1.0/res.x,pixel.y));
      vec4 leftColor = texture2D(bufferTexture,vec2(pixel.x - 1.0/res.x,pixel.y));
      vec4 upColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y + 1.0/res.y));
      vec4 downColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y - 1.0/res.y));

      //Diffuse equation
      float factor = 8.0 * 0.016 * (leftColor.r + rightColor.r + downColor.r * 3.0 + upColor.r - 6.0 * gl_FragColor.r);

      //Account for low precision of texels
      float minimum = 0.000003;
      if (factor >= -minimum && factor < -0.10) factor = -minimum;

      gl_FragColor.rgb += factor;
    }
  `
);

extend({ OffScreenMaterial });

const OffScreenScene = forwardRef(function OffScreenScene(props, ref) {
  const { size } = useThree();
  const offscreenMat = useRef(null);
  const debugUVTxt =  useTexture("/uvdebugtiles.png");
  useFrame(() => {
    if (offscreenMat.current) {
      // console.log('offscreenMat.current.uniforms', offscreenMat.current.uniforms)
      // console.log('offscreenMat.current.uniforms.time.value', offscreenMat.current.uniforms.time.value)
      offscreenMat.current.uniforms.time.value += 0.01;
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <planeGeometry args={[size.width, size.height]} />
        <offScreenMaterial
          debugUVTxt={debugUVTxt}
          ref={offscreenMat}
          bufferTexture={props.map}
          res={new THREE.Vector2(1024, 1024)}
          smokeSource={new THREE.Vector3(0, 0, 0)}
        />
      </mesh>
      <gridHelper />
    </group>
  );
});

const Plane = () => {
  const { scene, size, camera } = useThree();
  const offScreen = useRef();
  const onScreen = useRef();

  const offScreenFBOTexture = useFBO(1024, 1024, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter
  });
  const onScreenFBOTexture = useFBO(1024, 1024, {
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


  console.log({camera, size})

  const aspecRatio = size.width / size.height;
  const invAspecRatio = 1/aspecRatio;
  const distance = 1;

  const planeHeight = 1;
  const fov = 2 * Math.atan((planeHeight / 2) / distance) * (180 / Math.PI);

  console.log({fov})
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
        ref={onScreen}
        onPointerMove={onPointerMove}
        onPointerDown={onMouseDown}
        onPointerUp={onMouseUp}
      >
        <planeGeometry args={[size.width/size.height, 1, 1, 1]} />
        <meshBasicMaterial side={THREE.DoubleSide} map={onScreenFBOTexture} />
      </mesh>

      <gridHelper />

      {createPortal(
        <>
          <OffScreenScene ref={offScreen} map={offScreenFBOTexture.texture} />
          <OrthographicCamera
            makeDefault
            position={[0, 0, 1]}
            args={[
              -1, 1, 1, -1, 1, 1000
            ]}
            aspect={size.width / size.height}
            zoom={1}
            ref={offScreenCameraRef}
          />
        </>,
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
