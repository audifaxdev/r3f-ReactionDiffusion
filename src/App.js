import "./styles.css";
import React, { useRef, useCallback, useState, forwardRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  createPortal,
} from "@react-three/fiber";

import {
  OrthographicCamera,
  useFBO,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import {LinearFilter, NearestFilter} from "three";
import OffScreenScene from "./OffScreenScene";
import TextScene from "./TextFx";
// import {Bloom, DepthOfField, EffectComposer, Noise, Vignette} from "@react-three/postprocessing";

const pxRatio = window.devicePixelRatio;

const Plane = () => {
  const {scene, camera, size} = useThree();
  const textSceneRef = useRef();
  const offScreen = useRef();
  const onScreen = useRef();

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

  const textFBOTexture = useFBO(realWidth, realHeight, {
    minFilter: LinearFilter,
    magFilter: NearestFilter
  });

  const [offScreenScene] = useState(() => new THREE.Scene());
  const [textScene] = useState(() => new THREE.Scene());

  const offScreenCameraRef = useRef(null);
  const textSceneCameraRef = useRef(null);

  let textureA = offScreenFBOTexture;
  let textureB = onScreenFBOTexture;

  useFrame(({ gl, camera }) => {
    //render text msdf
    gl.setRenderTarget(textFBOTexture);
    gl.render(textScene, textSceneCameraRef.current);

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
        <meshBasicMaterial side={THREE.DoubleSide} map={offScreenFBOTexture} />
      </mesh>

      {createPortal(
        <>
          <OffScreenScene visible={true} ref={offScreen} map={offScreenFBOTexture.texture} text={textFBOTexture.texture}/>
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

      {createPortal(
        <>
          {/*<EffectComposer>*/}
          {/*  <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />*/}
          {/*  <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />*/}
          {/*  <Noise opacity={0.02} />*/}
          {/*  <Vignette eskil={false} offset={0.1} darkness={1.1} />*/}
          {/*</EffectComposer>*/}
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
        ,
        textScene
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
