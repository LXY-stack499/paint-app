        const canvas = document.getElementById('paintCanvas');
        const ctx = canvas.getContext('2d');
        const colorPicker = document.getElementById('colorPicker');
        const sizeSlider = document.getElementById('sizeSlider'); // 讀取滑桿
        const sizeValue = document.getElementById('sizeValue');   // 顯示數值

        let painting = false;
        let isEraser = false;
        let isFillMode = false;
        //儲存模塊
class History {
        constructor(canvas, ctx, maxSteps = 50) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.maxSteps = maxSteps;
            this.undoStack = [];
            this.redoStack = [];
        
            // 初始狀態存檔
            this.save();
    }

        // 取得當前畫面快照並存入堆疊
        save() {
            const snapshot = this.canvas.toDataURL();
        // 避免存入重複狀態
            if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
                return;
            }

            this.undoStack.push(snapshot);

        // 限制堆疊大小
            if (this.undoStack.length > this.maxSteps) {
                this.undoStack.shift();
            }

        // 只要有新動作，就清空重新堆疊
        this.redoStack = [];
        }

    undo() {
        if (this.undoStack.length <= 1) {
            // 只剩初始狀態時，清空畫布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        // 彈出當前畫面，移到 redo 堆疊
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // 讀取上一個狀態
        const prevState = this.undoStack[this.undoStack.length - 1];
        this.restore(prevState);
    }

    redo() {
        if (this.redoStack.length === 0) return;

        // 從 redo 取回狀態，移回 undo 堆疊
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        this._restore(nextState);
    }

    // 私有工具：將圖片數據畫回畫布
    restore(state) {
        let img = new Image();
        img.src = state;
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
    }
}
class PaintManager {
    constructor(canvasId, History) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = History;
        
        this.colorPicker = document.getElementById('colorPicker');
        this.sizeSlider = document.getElementById('sizeSlider');
        
        this.painting = false;
        this.isEraser = false;
        this.isFillMode = false;

        this._initEvents();
    }

    // 初始化事件監聽
    _initEvents() {
            // 使用 pointer 系列事件
        this.canvas.addEventListener('pointerdown', (e) => {
            // 防止右鍵觸發
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            
            if (this.isFillMode) {
                this.fill(e);
            } else {
                this.painting = true;
                // 為了滑順度，點下去那一刻就移動路徑起點
                this._startPath(e);
            }
        });

        // 全域監聽 pointerup，避免滑出畫布後放開滑鼠沒偵測到
        window.addEventListener('pointerup', (e) => {
            if (this.painting) {
                this.painting = false;
                this.ctx.beginPath();
                this.history.save(); 
            }
        });
        this.canvas.addEventListener('pointermove', (e) => this.draw(e));
        this.canvas.style.touchAction = 'none';
        // 增加滑順度（針對部分瀏覽器最佳化）
        this.ctx.imageSmoothingEnabled = true;
    }
    // 處理路徑起點
    _startPath(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    // 繪圖邏輯
    draw(e) {
        if (!this.painting) return;

        // 使用 clientX/Y 配合 getBoundingClientRect 是最穩定的手機端座標取得方式
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.ctx.lineWidth = this.sizeSlider.value;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round'; // 增加轉角平滑度

        if (this.isEraser) {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.colorPicker.value;
        }

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    // 模式切換
    setMode(mode) {
        this.isEraser = (mode === 'eraser');
        this.isFillMode = (mode === 'fill');
        this.painting = false;
    }

    // 背景顏色設定
    changeBackground(color) {
        this.canvas.style.backgroundColor = color;
        // 視覺背景
    }

    // 清除畫布
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.history.save();
    }

    // 私有填滿邏輯 (路徑填滿)
    fill(e) {
        this.ctx.fillStyle = this.colorPicker.value;
        this.ctx.fill();
        this.history.save();
    }
}
        //初始化
        const paintHistory = new History(canvas, ctx);
        const app = new PaintManager('paintCanvas', paintHistory);

        // 按鈕接口
        function usePencil() { app.setMode('pencil'); }
        function useEraser() { app.setMode('eraser'); }
        function useFill() { app.setMode('fill'); }
        function clearCanvas() { app.clear(); }
        function undo() { paintHistory.undo(); }
        function redo() { paintHistory.redo(); }

        function changeBackground() {
            const color = document.getElementById('bgPicker').value;
            app.changeBackground(color);
        }
        function downloadImage() {
            // 1. 建立一個暫時的畫布 (Off-screen Canvas)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 2. 取得背景顏色
            const bgColor = canvas.style.backgroundColor || "#ffffff"; 

            // 3. 先在暫時畫布填滿背景色
            tempCtx.fillStyle = bgColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // 4. 把原本畫布上的東西畫到暫時畫布上
            tempCtx.drawImage(canvas, 0, 0);

            // 5. 導出並下載
            const link = document.createElement('a');
            link.download = `my-drawing.png`;
            link.href = tempCanvas.toDataURL("image/png");
            link.click();
         }

        // 數值顯示更新
       sizeSlider.oninput = function() {
            sizeValue.innerHTML = this.value;
       };