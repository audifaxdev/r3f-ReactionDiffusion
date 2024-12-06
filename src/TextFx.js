import {useRef, useEffect, forwardRef, useState, useMemo, useCallback, useLayoutEffect} from 'react';
import {
  OrbitControls,
  useTexture,
  useHelper, OrthographicCamera, Html
} from '@react-three/drei';

import {
  Clock,
  NearestMipmapNearestFilter,
  BufferGeometry,
  BufferAttribute,
  Vector3,
  AxesHelper
} from 'three';
import {useControls} from 'leva';
import {extend, useFrame} from '@react-three/fiber';
import {TextGeometry as BMFTextGeometry} from "three-bmfont-text-es/";
import MSDFShader from './MSDFShader';
import font from "./manifold.json";

extend({BMFTextGeometry})
extend({MSDFShader})

const fontScale = 1;
const TextFx = forwardRef((props, ref) => {
  const textRef = useRef();
  const matRef = useRef();
  const mat2Ref = useRef();
  const [textPositions, setTextPositions] = useState(false);
  const axesHelper = useRef();
  const [text, setText] = useState('AU');
  const map = useTexture("./manifold-msdf.png");
  map.minFilter = NearestMipmapNearestFilter;
  const clock = new Clock();
  clock.getElapsedTime();

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.time.value += .1;
    }
  });
  const bmFTextStableRef = useRef(null);

  useLayoutEffect(() => {
    if (!bmFTextStableRef.current) {
      console.log('bmFTextStableRef is null');
      return;
    }

    // setTimeout(() => {
      const bGeo = bmFTextStableRef.current;
      bGeo.scale(fontScale, -fontScale, -fontScale);
      bGeo.computeBoundingBox();
      const b = bGeo.boundingBox;
      let min = b.min;
      let size = new Vector3();
      b.getSize(size);
      size = size.multiplyScalar(0.5);
      bGeo.translate(-min.x-size.x, -min.y-size.y, -min.z-size.z);
      bGeo.attributes.position.needsUpdate = true;
      bGeo.computeBoundingBox();
      bGeo.computeBoundingSphere();
    // }, 0)

    // window.addEventListener("pointermove", (e) => {
    //   let x = e.clientX / window.innerWidth;
    //   let y = e.clientY / window.innerHeight;
    //   matRef.current.uniforms.mouseC.value.x = x;
    //   matRef.current.uniforms.mouseC.value.y = y;
    // });

  }, [bmFTextStableRef.current]);


  return (
    <>
      <color args={["black"]} attach="background"/>
      {/*<mesh ref={axesHelper} />*/}
      <group visible={true}>
        <mesh ref={textRef} scale={[3,3,3]}>
          <bMFTextGeometry ref={bmFTextStableRef} args={[{
            text,
            font,
            align: 'center',
            flipY: map.flipY
          }]} />
          <mSDFShader ref={matRef} args={[{
            map,
            transparent: true,
            color: '#ff0000',
            negate: false,
          }]} />
        </mesh>
      </group>
    </>
  );
});

export default TextFx;