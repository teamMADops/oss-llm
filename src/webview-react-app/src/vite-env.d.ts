/// <reference types="vite/client" />

// SVG 파일을 문자열로 import하기 위한 타입 선언
declare module '*.svg' {
  const src: string;
  export default src;
}
