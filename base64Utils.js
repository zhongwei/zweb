// base64Utils.js

// 将位图数组转换为 Base64
const bitmapToBase64 = (bitmap) => {
  const binaryString = bitmap.map((bit) => (bit ? "1" : "0")).join("");
  const binaryBuffer = new Uint8Array(
    binaryString.match(/.{1,8}/g).map((byte) => parseInt(byte, 2))
  );
  return btoa(String.fromCharCode(...binaryBuffer));
};

// 从 Base64 解码位图
const decodeBitmapFromBase64 = (base64) => {
  const binaryString = atob(base64);
  const byteArray = Array.from(binaryString).map((char) => char.charCodeAt(0));
  return byteArray.flatMap((byte) =>
    byte.toString(2).padStart(8, "0").split("").map(Number)
  );
};

// 将函数挂载到 window 对象上
window.bitmapToBase64 = bitmapToBase64;
window.decodeBitmapFromBase64 = decodeBitmapFromBase64;
