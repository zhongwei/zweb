const s1 = "an.8.7,an.29.7,an.116.7,an.19.7,an.19.17,otx.121.96,otx.121.94,otx.121.93,otx.121.92,otx.121.88,otx.103.122,otx.103.124,otx.103.128,otx.103.132,otx.103.135,otx.103.138,otx.103.142,otx.103.145,otx.103.148,hlp.1.7,hlp.1.7,hlp.1.7,hlp.11.7"

// 将字符串按逗号分隔为多个子串，去重并排序
const substrings = Array.from(new Set(s1.split(',')))
    .sort((a, b) => {
        const [tA, aA, nA] = a.split('.');
        const [tB, aB, nB] = b.split('.');
        // 先比较 `${t}`，然后比较 `${a}`，最后比较 `${n}`
        if (tA !== tB) return tA.localeCompare(tB);
        if (aA !== aB) return aA - aB;
        return Number(nA) - Number(nB);
    });

// 创建一个对象来存储 `${t}` 和 `${a}` 下的编号位图
const bitmapMap = {};

// 遍历每个子串
substrings.forEach(str => {
    // 将子串按点分隔为 t, a, n 三部分
    const [t, a, n] = str.split('.');

    // 如果第一层 `${t}` 还没有初始化，创建空对象
    if (!bitmapMap[t]) {
        bitmapMap[t] = {};
    }

    // 如果第二层 `${a}` 还没有初始化，创建一个空数组
    if (!bitmapMap[t][a]) {
        bitmapMap[t][a] = [];
    }

    // 将编号 n 转换为数字并添加到数组中
    bitmapMap[t][a].push(Number(n));
});

// 对每个 `${t}.${a}` 的编号进行排序
for (let tKey in bitmapMap) {
    for (let aKey in bitmapMap[tKey]) {
        // 排序编号
        bitmapMap[tKey][aKey] = Array.from(new Set(bitmapMap[tKey][aKey])).sort((a, b) => a - b);
    }
}

// 生成位图并转换为 Base64
function generateBitmap(numbers) {
    // 找到最大值以确定位图的长度
    const maxNum = Math.max(...numbers);
    const bitmap = new Uint8Array(Math.ceil(maxNum / 8));

    // 设置位图中的对应位
    numbers.forEach(num => {
        const index = Math.floor((num - 1) / 8);  // 确定字节索引
        const bitPos = (num - 1) % 8;             // 确定在字节中的位位置
        bitmap[index] |= (1 << bitPos);           // 设置该位
    });

    // 将位图转换为 Base64
    return btoa(String.fromCharCode(...bitmap));
}

// 将所有 `${t}.${a}` 的位图组合成二维数组格式
const resultArray = Object.entries(bitmapMap).map(([tKey, aMap]) => {
    // 对于每个 `${t}`，生成 `${a}.base64` 的逗号分隔字符串
    const aBase64String = Object.entries(aMap).map(([aKey, numbers]) => {
        const base64Bitmap = generateBitmap(numbers);
        return `${aKey}.${base64Bitmap}`;
    }).join(',');
    
    return [tKey, aBase64String];
});

console.log(resultArray);


// Base64 解码为位图的函数
function decodeBase64ToBitmap(base64String) {
    const binaryString = atob(base64String);
    const bitmap = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bitmap[i] = binaryString.charCodeAt(i);
    }
    return bitmap;
}

// 从位图中还原编号的函数
function getNumbersFromBitmap(bitmap) {
    const numbers = [];
    for (let i = 0; i < bitmap.length; i++) {
        for (let bitPos = 0; bitPos < 8; bitPos++) {
            if (bitmap[i] & (1 << bitPos)) {
                // 计算编号，bitmap 是从 1 开始，所以要加上 1
                numbers.push(i * 8 + bitPos + 1);
            }
        }
    }
    return numbers;
}

// 根据 t 和 a 查询对应的编号
function queryNumbers(t, a) {
    // 在二维数组中查找 t
    const tEntry = resultArray.find(entry => entry[0] === t);
    if (!tEntry) {
        console.log(`类别 ${t} 未找到`);
        return [];
    }

    // 在 tEntry 中查找对应的 a
    const aBase64List = tEntry[1].split(',');
    const aBase64Entry = aBase64List.find(entry => entry.startsWith(a + '.'));
    if (!aBase64Entry) {
        console.log(`目录 ${a} 未找到`);
        return [];
    }

    // 提取 base64 位图并解码
    const base64Bitmap = aBase64Entry.split('.')[1];
    const bitmap = decodeBase64ToBitmap(base64Bitmap);

    // 从位图还原数字编号
    return getNumbersFromBitmap(bitmap);
}

// 示例查询
const t = "otx";  // 类别
const a = "121";  // 目录分类
const result = queryNumbers(t, a);

console.log(result);  // 输出恢复出的数字编号