// 引入组件文件
const script = document.createElement('script');
script.src = 'ImageCard.js'; // 这里假设 ImageCard.js 和 main.js 在同一目录
document.head.appendChild(script);

script.onload = () => {
  const { createApp, ref, watch } = Vue;
  const app = createApp({
    components: { ImageCard }, // 在这里注册组件
    setup() {
      const t = ref(new URLSearchParams(window.location.search).get("t") || "");
      const a = ref(new URLSearchParams(window.location.search).get("a") || "");
      const c = Math.max(0, Number(new URLSearchParams(window.location.search).get("c")) || 0);
      const numbers = ref(Array.from({ length: c }, (_, k) => k + 1));
      const clickedBitmap = ref(Array(c).fill(0));

      const loadPreviousBitmap = () => {
        const storedStrings = localStorage.getItem("imageBitmaps") || "";
        const found = storedStrings.split(",").find((item) => item.startsWith(`${t.value}.${a.value}.`));
        if (found) {
          const base64Bitmap = found.split(".")[2];
          return window.decodeBitmapFromBase64(base64Bitmap);
        }
        return Array(c).fill(0);
      };

      const saveToLocalStorage = (num) => {
        clickedBitmap.value[num - 1] = 1;
        const base64Bitmap = window.bitmapToBase64(clickedBitmap.value);

        let storedStrings = localStorage.getItem("imageBitmaps") || "";
        const newEntry = `${t.value}.${a.value}.${base64Bitmap}`;

        if (storedStrings.includes(`${t.value}.${a.value}`)) {
          storedStrings = storedStrings.replace(
            new RegExp(`${t.value}.${a.value}.[^,]+`),
            newEntry
          );
        } else {
          storedStrings += (storedStrings ? "," : "") + newEntry;
        }

        localStorage.setItem("imageBitmaps", storedStrings);
      };

      watch(numbers, () => {
        const loadedBitmap = loadPreviousBitmap();
        clickedBitmap.value = [...loadedBitmap];
      });

      clickedBitmap.value = [...loadPreviousBitmap()];

      return { t, a, numbers, saveToLocalStorage, clickedBitmap };
    },
  });

  app.mount("#app");
};
