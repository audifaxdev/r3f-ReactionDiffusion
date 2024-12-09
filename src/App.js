import "./styles.css";
import React, {useEffect, useRef, useState} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  createPortal, extend,
} from "@react-three/fiber";

import {
  OrthographicCamera,
  useFBO,
  PerspectiveCamera, RenderTexture,
} from "@react-three/drei";
import * as THREE from "three";
import {LinearFilter, NearestFilter, Raycaster, ShaderMaterial, Uniform, Vector2, Vector3} from "three";
import OffScreenScene from "./OffScreenScene";
import TextScene from "./TextFx";
import AfterFx from "./AfterFx";

const pxRatio = window.devicePixelRatio;

extend({AfterFx})

const Plane = () => {
  const {scene, camera, size} = useThree();
  const textSceneRef = useRef();
  const offScreen = useRef();
  const onScreen = useRef();
  const afterFxRef = useRef();
  const [txtFrame, setTextFrame] = useState();

  const realWidth = size.width*pxRatio;
  const realHeight = size.height*pxRatio;

  const offScreenFBOTexture = useFBO(realWidth, realHeight, {
    minFilter: LinearFilter,
    magFilter: NearestFilter
  });

  const onScreenFBOTexture = useFBO(realWidth, realHeight, {
    minFilter: LinearFilter,
    magFilter: NearestFilter
  });


  const [offScreenScene] = useState(() => new THREE.Scene());
  // const [textScene] = useState(() => new THREE.Scene());

  const offScreenCameraRef = useRef(null);
  const textSceneCameraRef = useRef(null);

  let textureA = offScreenFBOTexture;
  let textureB = onScreenFBOTexture;

  useFrame(({ gl, camera }) => {
    //render target texture
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

  const aspecRatio = size.width / size.height;
  const invAspecRatio = 1/aspecRatio;
  const distance = 1;

  const planeHeight = 1;
  const fov = 2 * Math.atan((planeHeight / 2) / distance) * (180 / Math.PI);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const res = new Vector2(realWidth, realHeight);

  window.addEventListener('pointermove', (e) => {
    pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    if (afterFxRef.current) {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects( scene.children, false );
      if (intersects.length) {
        // afterFxRef.current.uniforms.mouseC.value = intersects[0].uv;
      }
    }
  });

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
      >
        <planeGeometry args={[size.width/size.height, 1, 1, 1]} />
        <afterFx ref={afterFxRef} side={THREE.DoubleSide} txtTexture={txtFrame} bufferTexture={onScreenFBOTexture.texture} />
        {/*<meshBasicMaterial side={THREE.DoubleSide} map={onScreenFBOTexture} />*/}
      </mesh>

      {createPortal(
        <>
          <OffScreenScene visible={true} ref={offScreen} map={offScreenFBOTexture.texture} text={txtFrame}/>
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

      <RenderTexture frames={1} onUpdate={frame => setTimeout(() => setTextFrame(frame), [])}>
        <>
          <TextScene visible={true} ref={textSceneRef} />
          <OrthographicCamera
            makeDefault
            position={[0, 0, 1]}
            args={[
              -1, 1, 1, -1, 1, 1000
            ]}
            aspect={size.width / size.height}
            zoom={1}
            ref={textSceneCameraRef}
          />
        </>
      </RenderTexture>
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
