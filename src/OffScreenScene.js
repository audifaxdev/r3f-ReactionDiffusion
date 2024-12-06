import {extend, useFrame, useThree} from "@react-three/fiber";
import React, {forwardRef, useRef, useState} from "react";
import {useTexture} from "@react-three/drei";
import {Clock} from "three";
import {button, useControls} from "leva";
import * as THREE from "three";
import ReactionDiffusionShader from "./ReactionDiffusionShader";

extend({ ReactionDiffusionShader });
const pxRatio = window.devicePixelRatio;

const OffScreenScene = forwardRef((props, ref) => {
  const { visible } = props;
  const { size } = useThree();
  const offscreenMat = useRef(null);
  const [text, setText] = useState('AU');
  const debugUVTxt =  useTexture("/uvdebugtiles.png");
  const msdfMap = useTexture("./manifold-msdf.png");
  const bmFTextStableRef = useRef(null);

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
  const realWidth = size.width*pxRatio;
  const realHeight = size.height*pxRatio;

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
        <planeGeometry args={[size.width, size.height]}/>
        <reactionDiffusionShader
          debugUVTxt={debugUVTxt}
          ref={offscreenMat}
          bufferTexture={props.map}
          textTexture={props.text}
          res={new THREE.Vector2(realWidth , realHeight)}
        />

      </mesh>
    </group>
  );
});

export default OffScreenScene;