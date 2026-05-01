class PhotoEditor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        this.originalImage = null;
        this.currentImage = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        this.isCropping = false;
        this.cropSelection = null;
        
        this.textObjects = [];
        this.selectedTextObject = null;
        
        this.stickerObjects = [];
        this.selectedStickerObject = null;
        this.customStickers = [];
        
        this.mergeImages = [];
        this.mergeDirection = 'horizontal';
        
        this.isDragging = false;
        this.dragTarget = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartWidth = 0;
        this.resizeStartHeight = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.disableTools();
        this.updateImageInfo();
    }
    
    setupEventListeners() {
        // 文件操作
        document.getElementById('btn-open').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });
        
        // 保存/导出
        document.getElementById('btn-save').addEventListener('click', () => {
            document.getElementById('export-modal').classList.remove('hidden');
        });
        
        document.getElementById('cancel-export').addEventListener('click', () => {
            document.getElementById('export-modal').classList.add('hidden');
        });
        
        document.getElementById('confirm-export').addEventListener('click', () => {
            this.exportImage();
        });
        
        document.getElementById('export-format').addEventListener('change', (e) => {
            const qualityContainer = document.getElementById('quality-container');
            if (e.target.value === 'jpeg' || e.target.value === 'webp') {
                qualityContainer.style.display = 'block';
            } else {
                qualityContainer.style.display = 'none';
            }
        });
        
        document.getElementById('export-quality').addEventListener('input', (e) => {
            document.getElementById('quality-value').textContent = e.target.value;
        });
        
        // 重置
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.reset();
        });
        
        // 基础操作
        document.getElementById('tool-rotate-cw').addEventListener('click', () => {
            this.rotate(90);
        });
        
        document.getElementById('tool-rotate-ccw').addEventListener('click', () => {
            this.rotate(-90);
        });
        
        document.getElementById('tool-flip-h').addEventListener('click', () => {
            this.flip('horizontal');
        });
        
        document.getElementById('tool-flip-v').addEventListener('click', () => {
            this.flip('vertical');
        });
        
        // 尺寸调整
        document.getElementById('resize-constrain').addEventListener('change', (e) => {
            if (e.target.checked && this.currentImage) {
                const ratio = this.currentImage.width / this.currentImage.height;
                document.getElementById('resize-height').value = Math.round(parseInt(document.getElementById('resize-width').value) / ratio);
            }
        });
        
        document.getElementById('resize-width').addEventListener('input', (e) => {
            if (document.getElementById('resize-constrain').checked && this.currentImage) {
                const ratio = this.currentImage.width / this.currentImage.height;
                document.getElementById('resize-height').value = Math.round(parseInt(e.target.value) / ratio);
            }
        });
        
        document.getElementById('resize-height').addEventListener('input', (e) => {
            if (document.getElementById('resize-constrain').checked && this.currentImage) {
                const ratio = this.currentImage.width / this.currentImage.height;
                document.getElementById('resize-width').value = Math.round(parseInt(e.target.value) * ratio);
            }
        });
        
        document.getElementById('tool-resize').addEventListener('click', () => {
            const width = parseInt(document.getElementById('resize-width').value);
            const height = parseInt(document.getElementById('resize-height').value);
            if (width > 0 && height > 0) {
                this.resize(width, height);
            }
        });
        
        // 裁剪
        document.getElementById('tool-crop-start').addEventListener('click', () => {
            this.startCrop();
        });
        
        document.getElementById('tool-crop-apply').addEventListener('click', () => {
            this.applyCrop();
        });
        
        document.getElementById('tool-crop-cancel').addEventListener('click', () => {
            this.cancelCrop();
        });
        
        // 文字添加
        document.getElementById('tool-add-text').addEventListener('click', () => {
            this.addText();
        });
        
        // 文字版式
        document.querySelectorAll('.text-template').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.dataset.template;
                this.applyTextTemplate(template);
            });
        });
        
        // 边框
        document.getElementById('tool-add-border').addEventListener('click', () => {
            const width = parseInt(document.getElementById('border-width').value);
            const color = document.getElementById('border-color').value;
            this.addBorder(width, color);
        });
        
        // 内置边框
        document.querySelectorAll('.border-template').forEach(btn => {
            btn.addEventListener('click', () => {
                const border = btn.dataset.border;
                this.applyBorderTemplate(border);
            });
        });
        
        // 贴纸
        document.getElementById('btn-add-sticker').addEventListener('click', () => {
            document.getElementById('sticker-input').click();
        });
        
        document.getElementById('sticker-input').addEventListener('change', (e) => {
            this.addCustomSticker(e.target.files[0]);
        });
        
        document.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sticker = btn.dataset.sticker;
                const emoji = btn.dataset.emoji;
                if (sticker) {
                    this.addShapeSticker(sticker);
                } else if (emoji) {
                    this.addEmojiSticker(emoji);
                }
            });
        });
        
        // 图片拼接
        document.getElementById('btn-add-merge-image').addEventListener('click', () => {
            document.getElementById('merge-input').click();
        });
        
        document.getElementById('merge-input').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.addMergeImage(file);
            });
        });
        
        document.getElementById('merge-h').addEventListener('click', () => {
            this.mergeDirection = 'horizontal';
            document.getElementById('merge-h').classList.add('bg-blue-600');
            document.getElementById('merge-v').classList.remove('bg-blue-600');
        });
        
        document.getElementById('merge-v').addEventListener('click', () => {
            this.mergeDirection = 'vertical';
            document.getElementById('merge-v').classList.add('bg-blue-600');
            document.getElementById('merge-h').classList.remove('bg-blue-600');
        });
        
        document.getElementById('tool-merge').addEventListener('click', () => {
            this.mergeImages();
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedTextObject) {
                    this.removeTextObject(this.selectedTextObject);
                }
                if (this.selectedStickerObject) {
                    this.removeStickerObject(this.selectedStickerObject);
                }
            }
            if (e.key === 'Escape') {
                this.deselectAll();
                this.cancelCrop();
            }
        });
        
        // 画布点击
        this.canvas.addEventListener('click', (e) => {
            this.deselectAll();
        });
        
        // 模态框点击外部关闭
        document.getElementById('export-modal').addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                document.getElementById('export-modal').classList.add('hidden');
            }
        });
    }
    
    disableTools() {
        const tools = [
            'tool-rotate-cw', 'tool-rotate-ccw', 'tool-flip-h', 'tool-flip-v',
            'tool-resize', 'tool-crop-start', 'tool-add-text', 'tool-add-border',
            'btn-save', 'btn-reset'
        ];
        tools.forEach(id => {
            document.getElementById(id).classList.add('disabled');
        });
    }
    
    enableTools() {
        const tools = [
            'tool-rotate-cw', 'tool-rotate-ccw', 'tool-flip-h', 'tool-flip-v',
            'tool-resize', 'tool-crop-start', 'tool-add-text', 'tool-add-border',
            'btn-save', 'btn-reset'
        ];
        tools.forEach(id => {
            document.getElementById(id).classList.remove('disabled');
        });
    }
    
    loadImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('请选择有效的图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                
                this.textObjects = [];
                this.stickerObjects = [];
                
                this.resizeCanvas(img.width, img.height);
                
                document.getElementById('resize-width').value = img.width;
                document.getElementById('resize-height').value = img.height;
                
                this.enableTools();
                this.updateImageInfo();
                this.saveState();
                this.render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        this.overlayCanvas.style.display = 'none';
    }
    
    updateImageInfo() {
        const infoElement = document.getElementById('image-info');
        if (this.currentImage) {
            infoElement.textContent = `${this.currentImage.width} x ${this.currentImage.height} px`;
        } else {
            infoElement.textContent = '';
        }
    }
    
    saveState() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        const state = {
            imageData: this.getImageData(),
            textObjects: JSON.parse(JSON.stringify(this.textObjects)),
            stickerObjects: JSON.parse(JSON.stringify(this.stickerObjects))
        };
        
        this.history.push(state);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    getImageData() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);
        return tempCanvas.toDataURL();
    }
    
    restoreState(state) {
        const img = new Image();
        img.onload = () => {
            this.resizeCanvas(img.width, img.height);
            this.ctx.drawImage(img, 0, 0);
            this.currentImage = img;
            
            this.textObjects = state.textObjects || [];
            this.stickerObjects = state.stickerObjects || [];
            
            this.renderTextObjects();
            this.renderStickerObjects();
            this.updateImageInfo();
        };
        img.src = state.imageData;
    }
    
    render() {
        if (!this.currentImage) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);
        
        this.renderTextObjects();
        this.renderStickerObjects();
    }
    
    renderTextObjects() {
        this.textObjects.forEach((textObj, index) => {
            this.ctx.save();
            this.ctx.font = `${textObj.weight} ${textObj.size}px ${textObj.font}`;
            this.ctx.fillStyle = textObj.color;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            
            const lines = textObj.text.split('\n');
            lines.forEach((line, i) => {
                this.ctx.fillText(line, textObj.x, textObj.y + i * textObj.size * 1.2);
            });
            
            this.ctx.restore();
        });
    }
    
    renderStickerObjects() {
        this.stickerObjects.forEach(sticker => {
            if (sticker.element) {
                this.ctx.drawImage(
                    sticker.element,
                    sticker.x,
                    sticker.y,
                    sticker.width,
                    sticker.height
                );
            }
        });
    }
    
    // 旋转
    rotate(degrees) {
        if (!this.currentImage) return;
        
        this.saveState();
        
        const isClockwise = degrees > 0;
        const newWidth = this.canvas.height;
        const newHeight = this.canvas.width;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.save();
        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(degrees * Math.PI / 180);
        tempCtx.drawImage(
            this.currentImage,
            -this.currentImage.width / 2,
            -this.currentImage.height / 2
        );
        tempCtx.restore();
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(newWidth, newHeight);
            this.ctx.drawImage(img, 0, 0);
            this.updateImageInfo();
            this.render();
        };
        img.src = tempCanvas.toDataURL();
        
        // 旋转文字和贴纸对象
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.textObjects.forEach(textObj => {
            const relX = textObj.x - centerX;
            const relY = textObj.y - centerY;
            const rad = degrees * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            textObj.x = centerX + relX * cos - relY * sin;
            textObj.y = centerY + relX * sin + relY * cos;
        });
        
        this.stickerObjects.forEach(sticker => {
            const relX = sticker.x + sticker.width / 2 - centerX;
            const relY = sticker.y + sticker.height / 2 - centerY;
            const rad = degrees * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            sticker.x = centerX + relX * cos - relY * sin - sticker.width / 2;
            sticker.y = centerY + relX * sin + relY * cos - sticker.height / 2;
        });
    }
    
    // 翻转
    flip(direction) {
        if (!this.currentImage) return;
        
        this.saveState();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.save();
        if (direction === 'horizontal') {
            tempCtx.translate(this.canvas.width, 0);
            tempCtx.scale(-1, 1);
        } else {
            tempCtx.translate(0, this.canvas.height);
            tempCtx.scale(1, -1);
        }
        tempCtx.drawImage(this.currentImage, 0, 0);
        tempCtx.restore();
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            this.render();
        };
        img.src = tempCanvas.toDataURL();
        
        // 翻转文字和贴纸对象
        if (direction === 'horizontal') {
            this.textObjects.forEach(textObj => {
                textObj.x = this.canvas.width - textObj.x;
            });
            this.stickerObjects.forEach(sticker => {
                sticker.x = this.canvas.width - sticker.x - sticker.width;
            });
        } else {
            this.textObjects.forEach(textObj => {
                textObj.y = this.canvas.height - textObj.y;
            });
            this.stickerObjects.forEach(sticker => {
                sticker.y = this.canvas.height - sticker.y - sticker.height;
            });
        }
    }
    
    // 尺寸调整
    resize(width, height) {
        if (!this.currentImage) return;
        
        this.saveState();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(this.currentImage, 0, 0, width, height);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(width, height);
            this.ctx.drawImage(img, 0, 0);
            this.updateImageInfo();
            this.render();
        };
        img.src = tempCanvas.toDataURL();
        
        // 按比例调整文字和贴纸位置
        const scaleX = width / this.canvas.width;
        const scaleY = height / this.canvas.height;
        
        this.textObjects.forEach(textObj => {
            textObj.x *= scaleX;
            textObj.y *= scaleY;
            textObj.size *= Math.min(scaleX, scaleY);
        });
        
        this.stickerObjects.forEach(sticker => {
            sticker.x *= scaleX;
            sticker.y *= scaleY;
            sticker.width *= scaleX;
            sticker.height *= scaleY;
        });
    }
    
    // 裁剪功能
    startCrop() {
        if (!this.currentImage) return;
        
        this.isCropping = true;
        this.overlayCanvas.style.display = 'block';
        
        const margin = Math.min(this.canvas.width, this.canvas.height) * 0.1;
        this.cropSelection = {
            x: margin,
            y: margin,
            width: this.canvas.width - margin * 2,
            height: this.canvas.height - margin * 2
        };
        
        this.drawCropOverlay();
        this.setupCropEventListeners();
        
        document.getElementById('tool-crop-start').classList.add('hidden');
        document.getElementById('tool-crop-apply').classList.remove('hidden');
        document.getElementById('tool-crop-cancel').classList.remove('hidden');
    }
    
    drawCropOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.overlayCtx.fillRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        const { x, y, width, height } = this.cropSelection;
        this.overlayCtx.clearRect(x, y, width, height);
        
        this.overlayCtx.strokeStyle = '#3b82f6';
        this.overlayCtx.lineWidth = 2;
        this.overlayCtx.strokeRect(x, y, width, height);
        
        this.overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.overlayCtx.lineWidth = 1;
        this.overlayCtx.setLineDash([5, 5]);
        this.overlayCtx.strokeRect(x + width / 3, y, width / 3, height);
        this.overlayCtx.strokeRect(x, y + height / 3, width, height / 3);
        this.overlayCtx.setLineDash([]);
        
        const handleSize = 10;
        const handles = [
            [x - handleSize / 2, y - handleSize / 2],
            [x + width - handleSize / 2, y - handleSize / 2],
            [x - handleSize / 2, y + height - handleSize / 2],
            [x + width - handleSize / 2, y + height - handleSize / 2],
            [x + width / 2 - handleSize / 2, y - handleSize / 2],
            [x + width / 2 - handleSize / 2, y + height - handleSize / 2],
            [x - handleSize / 2, y + height / 2 - handleSize / 2],
            [x + width - handleSize / 2, y + height / 2 - handleSize / 2]
        ];
        
        this.overlayCtx.fillStyle = 'white';
        this.overlayCtx.strokeStyle = '#3b82f6';
        this.overlayCtx.lineWidth = 2;
        
        handles.forEach(([hx, hy]) => {
            this.overlayCtx.fillRect(hx, hy, handleSize, handleSize);
            this.overlayCtx.strokeRect(hx, hy, handleSize, handleSize);
        });
    }
    
    setupCropEventListeners() {
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let startSelection = null;
        let dragType = null;
        
        const getDragType = (e) => {
            const rect = this.overlayCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const { x: sx, y: sy, width: sw, height: sh } = this.cropSelection;
            const handleSize = 10;
            
            const handles = [
                { type: 'nw', x: sx - handleSize / 2, y: sy - handleSize / 2 },
                { type: 'ne', x: sx + sw - handleSize / 2, y: sy - handleSize / 2 },
                { type: 'sw', x: sx - handleSize / 2, y: sy + sh - handleSize / 2 },
                { type: 'se', x: sx + sw - handleSize / 2, y: sy + sh - handleSize / 2 },
                { type: 'n', x: sx + sw / 2 - handleSize / 2, y: sy - handleSize / 2 },
                { type: 's', x: sx + sw / 2 - handleSize / 2, y: sy + sh - handleSize / 2 },
                { type: 'w', x: sx - handleSize / 2, y: sy + sh / 2 - handleSize / 2 },
                { type: 'e', x: sx + sw - handleSize / 2, y: sy + sh / 2 - handleSize / 2 }
            ];
            
            for (const handle of handles) {
                if (x >= handle.x && x <= handle.x + handleSize &&
                    y >= handle.y && y <= handle.y + handleSize) {
                    return handle.type;
                }
            }
            
            if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
                return 'move';
            }
            
            return null;
        };
        
        const onMouseDown = (e) => {
            dragType = getDragType(e);
            if (!dragType) return;
            
            isDragging = true;
            const rect = this.overlayCanvas.getBoundingClientRect();
            dragStartX = e.clientX - rect.left;
            dragStartY = e.clientY - rect.top;
            startSelection = { ...this.cropSelection };
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = this.overlayCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dx = x - dragStartX;
            const dy = y - dragStartY;
            
            const { x: sx, y: sy, width: sw, height: sh } = startSelection;
            
            switch (dragType) {
                case 'move':
                    this.cropSelection.x = Math.max(0, Math.min(this.canvas.width - sw, sx + dx));
                    this.cropSelection.y = Math.max(0, Math.min(this.canvas.height - sh, sy + dy));
                    break;
                case 'nw':
                    this.cropSelection.x = Math.max(0, sx + dx);
                    this.cropSelection.y = Math.max(0, sy + dy);
                    this.cropSelection.width = sw - (this.cropSelection.x - sx);
                    this.cropSelection.height = sh - (this.cropSelection.y - sy);
                    break;
                case 'ne':
                    this.cropSelection.y = Math.max(0, sy + dy);
                    this.cropSelection.width = Math.min(this.canvas.width - sx, sw + dx);
                    this.cropSelection.height = sh - (this.cropSelection.y - sy);
                    break;
                case 'sw':
                    this.cropSelection.x = Math.max(0, sx + dx);
                    this.cropSelection.width = sw - (this.cropSelection.x - sx);
                    this.cropSelection.height = Math.min(this.canvas.height - sy, sh + dy);
                    break;
                case 'se':
                    this.cropSelection.width = Math.min(this.canvas.width - sx, sw + dx);
                    this.cropSelection.height = Math.min(this.canvas.height - sy, sh + dy);
                    break;
                case 'n':
                    this.cropSelection.y = Math.max(0, sy + dy);
                    this.cropSelection.height = sh - (this.cropSelection.y - sy);
                    break;
                case 's':
                    this.cropSelection.height = Math.min(this.canvas.height - sy, sh + dy);
                    break;
                case 'w':
                    this.cropSelection.x = Math.max(0, sx + dx);
                    this.cropSelection.width = sw - (this.cropSelection.x - sx);
                    break;
                case 'e':
                    this.cropSelection.width = Math.min(this.canvas.width - sx, sw + dx);
                    break;
            }
            
            this.drawCropOverlay();
        };
        
        const onMouseUp = () => {
            isDragging = false;
            dragType = null;
        };
        
        this.overlayCanvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    applyCrop() {
        if (!this.currentImage || !this.cropSelection) return;
        
        this.saveState();
        
        const { x, y, width, height } = this.cropSelection;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(
            this.canvas,
            x, y, width, height,
            0, 0, width, height
        );
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(width, height);
            this.ctx.drawImage(img, 0, 0);
            
            this.textObjects = [];
            this.stickerObjects = [];
            
            this.updateImageInfo();
            this.render();
            this.cancelCrop();
        };
        img.src = tempCanvas.toDataURL();
    }
    
    cancelCrop() {
        this.isCropping = false;
        this.cropSelection = null;
        this.overlayCanvas.style.display = 'none';
        
        document.getElementById('tool-crop-start').classList.remove('hidden');
        document.getElementById('tool-crop-apply').classList.add('hidden');
        document.getElementById('tool-crop-cancel').classList.add('hidden');
    }
    
    // 文字功能
    addText() {
        if (!this.currentImage) return;
        
        const text = document.getElementById('text-content').value || '双击编辑文字';
        const font = document.getElementById('text-font').value;
        const size = parseInt(document.getElementById('text-size').value) || 32;
        const color = document.getElementById('text-color').value;
        const weight = document.getElementById('text-weight').value;
        
        const textObj = {
            id: Date.now(),
            text: text,
            font: font,
            size: size,
            color: color,
            weight: weight,
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height / 2 - size / 2
        };
        
        this.textObjects.push(textObj);
        this.selectedTextObject = textObj;
        this.selectedStickerObject = null;
        
        this.saveState();
        this.render();
    }
    
    applyTextTemplate(template) {
        if (!this.currentImage) return;
        
        let textObj;
        const defaultText = '双击编辑文字';
        
        switch (template) {
            case 'watermark':
                textObj = {
                    id: Date.now(),
                    text: defaultText,
                    font: 'Arial',
                    size: Math.min(this.canvas.width, this.canvas.height) * 0.08,
                    color: 'rgba(255, 255, 255, 0.5)',
                    weight: 'normal',
                    x: this.canvas.width / 2,
                    y: this.canvas.height - this.canvas.height * 0.1,
                    textAlign: 'center'
                };
                break;
            case 'title':
                textObj = {
                    id: Date.now(),
                    text: defaultText,
                    font: 'Arial',
                    size: Math.min(this.canvas.width, this.canvas.height) * 0.12,
                    color: '#ffffff',
                    weight: 'bold',
                    x: this.canvas.width / 2,
                    y: this.canvas.height * 0.1,
                    textAlign: 'center'
                };
                break;
            case 'corner':
                textObj = {
                    id: Date.now(),
                    text: defaultText,
                    font: 'Arial',
                    size: Math.min(this.canvas.width, this.canvas.height) * 0.05,
                    color: '#ffffff',
                    weight: 'normal',
                    x: this.canvas.width * 0.8,
                    y: this.canvas.height * 0.85
                };
                break;
            case 'full':
                textObj = {
                    id: Date.now(),
                    text: defaultText,
                    font: 'Arial',
                    size: Math.min(this.canvas.width, this.canvas.height) * 0.2,
                    color: '#ffffff',
                    weight: 'bold',
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    textAlign: 'center',
                    textBaseline: 'middle'
                };
                break;
        }
        
        if (textObj) {
            this.textObjects.push(textObj);
            this.selectedTextObject = textObj;
            this.selectedStickerObject = null;
            
            this.saveState();
            this.render();
        }
    }
    
    removeTextObject(textObj) {
        const index = this.textObjects.indexOf(textObj);
        if (index > -1) {
            this.textObjects.splice(index, 1);
            this.selectedTextObject = null;
            this.saveState();
            this.render();
        }
    }
    
    // 边框功能
    addBorder(width, color) {
        if (!this.currentImage) return;
        
        this.saveState();
        
        const newWidth = this.canvas.width + width * 2;
        const newHeight = this.canvas.height + width * 2;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, newWidth, newHeight);
        
        tempCtx.drawImage(this.currentImage, width, width);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(newWidth, newHeight);
            this.ctx.drawImage(img, 0, 0);
            this.updateImageInfo();
            this.render();
        };
        img.src = tempCanvas.toDataURL();
        
        // 调整文字和贴纸位置
        this.textObjects.forEach(textObj => {
            textObj.x += width;
            textObj.y += width;
        });
        
        this.stickerObjects.forEach(sticker => {
            sticker.x += width;
            sticker.y += width;
        });
    }
    
    applyBorderTemplate(template) {
        if (!this.currentImage) return;
        
        this.saveState();
        
        let newWidth, newHeight;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        switch (template) {
            case 'polaroid':
                const bottomBorder = Math.max(this.canvas.height * 0.25, 50);
                const sideBorder = Math.max(this.canvas.width * 0.05, 20);
                newWidth = this.canvas.width + sideBorder * 2;
                newHeight = this.canvas.height + sideBorder + bottomBorder;
                
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
                
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(0, 0, newWidth, newHeight);
                
                tempCtx.fillStyle = '#333333';
                tempCtx.fillRect(sideBorder, sideBorder, this.canvas.width, this.canvas.height);
                
                tempCtx.drawImage(this.currentImage, sideBorder, sideBorder);
                
                tempCtx.fillStyle = '#666666';
                tempCtx.font = '16px Arial';
                tempCtx.textAlign = 'center';
                tempCtx.fillText('Polaroid Photo', newWidth / 2, newHeight - bottomBorder / 2);
                break;
                
            case 'instant':
                const instantBorder = Math.max(this.canvas.width * 0.08, 30);
                newWidth = this.canvas.width + instantBorder * 2;
                newHeight = this.canvas.height + instantBorder * 2;
                
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
                
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(0, 0, newWidth, newHeight);
                
                tempCtx.strokeStyle = '#333333';
                tempCtx.lineWidth = instantBorder * 0.15;
                tempCtx.strokeRect(
                    instantBorder * 0.3,
                    instantBorder * 0.3,
                    newWidth - instantBorder * 0.6,
                    newHeight - instantBorder * 0.6
                );
                
                tempCtx.drawImage(this.currentImage, instantBorder, instantBorder);
                break;
                
            case 'vintage':
                const vintageBorder = Math.max(this.canvas.width * 0.06, 25);
                newWidth = this.canvas.width + vintageBorder * 2;
                newHeight = this.canvas.height + vintageBorder * 2;
                
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
                
                const gradient = tempCtx.createLinearGradient(0, 0, newWidth, newHeight);
                gradient.addColorStop(0, '#f5e6d3');
                gradient.addColorStop(0.5, '#e8d5c4');
                gradient.addColorStop(1, '#d4c4b0');
                tempCtx.fillStyle = gradient;
                tempCtx.fillRect(0, 0, newWidth, newHeight);
                
                tempCtx.strokeStyle = '#8b7355';
                tempCtx.lineWidth = vintageBorder * 0.3;
                tempCtx.strokeRect(
                    vintageBorder * 0.5,
                    vintageBorder * 0.5,
                    newWidth - vintageBorder,
                    newHeight - vintageBorder
                );
                
                tempCtx.drawImage(this.currentImage, vintageBorder, vintageBorder);
                break;
                
            case 'shadow':
                const shadowBorder = Math.max(this.canvas.width * 0.1, 40);
                const shadowOffset = Math.max(shadowBorder * 0.3, 10);
                newWidth = this.canvas.width + shadowBorder * 2;
                newHeight = this.canvas.height + shadowBorder * 2;
                
                tempCanvas.width = newWidth;
                tempCanvas.height = newHeight;
                
                tempCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                tempCtx.fillRect(
                    shadowBorder + shadowOffset,
                    shadowBorder + shadowOffset,
                    this.canvas.width,
                    this.canvas.height
                );
                
                tempCtx.fillStyle = '#ffffff';
                tempCtx.fillRect(shadowBorder, shadowBorder, this.canvas.width, this.canvas.height);
                
                tempCtx.strokeStyle = '#e5e5e5';
                tempCtx.lineWidth = 1;
                tempCtx.strokeRect(shadowBorder, shadowBorder, this.canvas.width, this.canvas.height);
                
                tempCtx.drawImage(this.currentImage, shadowBorder, shadowBorder);
                break;
        }
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(newWidth, newHeight);
            this.ctx.drawImage(img, 0, 0);
            this.updateImageInfo();
            this.render();
        };
        img.src = tempCanvas.toDataURL();
        
        const borderOffset = Math.max(this.canvas.width * 0.05, 20);
        this.textObjects.forEach(textObj => {
            textObj.x += borderOffset;
            textObj.y += borderOffset;
        });
        
        this.stickerObjects.forEach(sticker => {
            sticker.x += borderOffset;
            sticker.y += borderOffset;
        });
    }
    
    // 贴纸功能
    addCustomSticker(file) {
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.customStickers.push({
                    id: Date.now(),
                    src: e.target.result,
                    element: img
                });
                this.renderCustomStickers();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    renderCustomStickers() {
        const container = document.getElementById('custom-stickers');
        container.innerHTML = '';
        
        this.customStickers.forEach(sticker => {
            const div = document.createElement('div');
            div.className = 'custom-sticker';
            const img = document.createElement('img');
            img.src = sticker.src;
            img.alt = 'sticker';
            div.appendChild(img);
            
            div.addEventListener('click', () => {
                this.addStickerToCanvas(sticker.element);
            });
            
            container.appendChild(div);
        });
    }
    
    addStickerToCanvas(imgElement) {
        if (!this.currentImage) return;
        
        const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        let width = imgElement.width;
        let height = imgElement.height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
        }
        
        const stickerObj = {
            id: Date.now(),
            element: imgElement,
            x: (this.canvas.width - width) / 2,
            y: (this.canvas.height - height) / 2,
            width: width,
            height: height
        };
        
        this.stickerObjects.push(stickerObj);
        this.selectedStickerObject = stickerObj;
        this.selectedTextObject = null;
        
        this.saveState();
        this.render();
    }
    
    addShapeSticker(shape) {
        if (!this.currentImage) return;
        
        const size = Math.min(this.canvas.width, this.canvas.height) * 0.2;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        switch (shape) {
            case 'circle':
                tempCtx.fillStyle = '#60a5fa';
                tempCtx.beginPath();
                tempCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                tempCtx.fill();
                break;
            case 'square':
                tempCtx.fillStyle = '#4ade80';
                tempCtx.fillRect(0, 0, size, size);
                break;
            case 'triangle':
                tempCtx.fillStyle = '#facc15';
                tempCtx.beginPath();
                tempCtx.moveTo(size / 2, 0);
                tempCtx.lineTo(size, size);
                tempCtx.lineTo(0, size);
                tempCtx.closePath();
                tempCtx.fill();
                break;
            case 'heart':
                tempCtx.fillStyle = '#f87171';
                tempCtx.beginPath();
                tempCtx.moveTo(size / 2, size * 0.3);
                tempCtx.bezierCurveTo(size * 0.1, 0, 0, size * 0.5, size / 2, size * 0.9);
                tempCtx.bezierCurveTo(size, size * 0.5, size * 0.9, 0, size / 2, size * 0.3);
                tempCtx.fill();
                break;
            case 'star':
                tempCtx.fillStyle = '#fbbf24';
                this.drawStar(tempCtx, size / 2, size / 2, 5, size / 2, size / 4);
                break;
            case 'arrow':
                tempCtx.fillStyle = '#a78bfa';
                tempCtx.beginPath();
                tempCtx.moveTo(size * 0.7, size * 0.35);
                tempCtx.lineTo(size, size * 0.5);
                tempCtx.lineTo(size * 0.7, size * 0.65);
                tempCtx.lineTo(size * 0.7, size * 0.58);
                tempCtx.lineTo(0, size * 0.58);
                tempCtx.lineTo(0, size * 0.42);
                tempCtx.lineTo(size * 0.7, size * 0.42);
                tempCtx.closePath();
                tempCtx.fill();
                break;
            case 'blur-circle':
                const gradient = tempCtx.createRadialGradient(
                    size / 2, size / 2, 0,
                    size / 2, size / 2, size / 2
                );
                gradient.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
                gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
                gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
                tempCtx.fillStyle = gradient;
                tempCtx.beginPath();
                tempCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                tempCtx.fill();
                break;
            case 'line-h':
                tempCtx.strokeStyle = '#22d3ee';
                tempCtx.lineWidth = size * 0.15;
                tempCtx.lineCap = 'round';
                tempCtx.beginPath();
                tempCtx.moveTo(size * 0.1, size / 2);
                tempCtx.lineTo(size * 0.9, size / 2);
                tempCtx.stroke();
                break;
            case 'sparkle':
                tempCtx.fillStyle = '#fef08a';
                this.drawSparkle(tempCtx, size / 2, size / 2, size * 0.4, size * 0.15);
                break;
        }
        
        const img = new Image();
        img.onload = () => {
            this.addStickerToCanvas(img);
        };
        img.src = tempCanvas.toDataURL();
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    drawSparkle(ctx, cx, cy, outerRadius, innerRadius) {
        const points = 4;
        let rot = 0;
        const step = Math.PI / points;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < points; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step / 2;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step / 2;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    addEmojiSticker(emoji) {
        if (!this.currentImage) return;
        
        const size = Math.min(this.canvas.width, this.canvas.height) * 0.2;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.font = `${size * 0.8}px Arial`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(emoji, size / 2, size / 2);
        
        const img = new Image();
        img.onload = () => {
            this.addStickerToCanvas(img);
        };
        img.src = tempCanvas.toDataURL();
    }
    
    removeStickerObject(stickerObj) {
        const index = this.stickerObjects.indexOf(stickerObj);
        if (index > -1) {
            this.stickerObjects.splice(index, 1);
            this.selectedStickerObject = null;
            this.saveState();
            this.render();
        }
    }
    
    // 图片拼接功能
    addMergeImage(file) {
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const mergeItem = {
                    id: Date.now(),
                    file: file,
                    src: e.target.result,
                    element: img
                };
                this.mergeImages.push(mergeItem);
                this.renderMergeList();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    renderMergeList() {
        const container = document.getElementById('merge-images-list');
        container.innerHTML = '';
        
        this.mergeImages.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'merge-thumbnail';
            div.innerHTML = `
                <img src="${item.src}" alt="merge-image-${index}">
                <div class="remove-btn" data-index="${index}">&times;</div>
            `;
            
            div.querySelector('.remove-btn').addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.mergeImages.splice(idx, 1);
                this.renderMergeList();
            });
            
            container.appendChild(div);
        });
    }
    
    mergeImages() {
        if (this.mergeImages.length === 0) {
            alert('请先添加要拼接的图片');
            return;
        }
        
        const direction = this.mergeDirection;
        const gap = parseInt(document.getElementById('merge-gap').value) || 0;
        const bgColor = document.getElementById('merge-bg').value;
        
        let totalWidth = 0;
        let totalHeight = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        
        if (this.currentImage) {
            maxWidth = this.currentImage.width;
            maxHeight = this.currentImage.height;
            if (direction === 'horizontal') {
                totalWidth = this.currentImage.width;
                totalHeight = this.currentImage.height;
            } else {
                totalWidth = this.currentImage.width;
                totalHeight = this.currentImage.height;
            }
        }
        
        this.mergeImages.forEach(item => {
            if (direction === 'horizontal') {
                totalWidth += item.element.width + gap;
                totalHeight = Math.max(totalHeight, item.element.height);
                maxHeight = Math.max(maxHeight, item.element.height);
            } else {
                totalHeight += item.element.height + gap;
                totalWidth = Math.max(totalWidth, item.element.width);
                maxWidth = Math.max(maxWidth, item.element.width);
            }
        });
        
        if (gap > 0) {
            if (direction === 'horizontal' && this.currentImage) {
                totalWidth -= gap;
            } else if (direction === 'vertical' && this.currentImage) {
                totalHeight -= gap;
            }
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = totalWidth;
        tempCanvas.height = totalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = bgColor;
        tempCtx.fillRect(0, 0, totalWidth, totalHeight);
        
        let offsetX = 0;
        let offsetY = 0;
        
        if (this.currentImage) {
            let drawX = offsetX;
            let drawY = offsetY;
            
            if (direction === 'horizontal') {
                drawY = (totalHeight - this.currentImage.height) / 2;
            } else {
                drawX = (totalWidth - this.currentImage.width) / 2;
            }
            
            tempCtx.drawImage(this.currentImage, drawX, drawY);
            
            if (direction === 'horizontal') {
                offsetX += this.currentImage.width + gap;
            } else {
                offsetY += this.currentImage.height + gap;
            }
        }
        
        this.mergeImages.forEach(item => {
            let drawX = offsetX;
            let drawY = offsetY;
            
            if (direction === 'horizontal') {
                drawY = (totalHeight - item.element.height) / 2;
                offsetX += item.element.width + gap;
            } else {
                drawX = (totalWidth - item.element.width) / 2;
                offsetY += item.element.height + gap;
            }
            
            tempCtx.drawImage(item.element, drawX, drawY);
        });
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resizeCanvas(totalWidth, totalHeight);
            this.ctx.drawImage(img, 0, 0);
            
            this.textObjects = [];
            this.stickerObjects = [];
            
            this.updateImageInfo();
            this.enableTools();
            this.saveState();
            this.render();
        };
        img.src = tempCanvas.toDataURL();
    }
    
    // 导出功能
    exportImage() {
        const format = document.getElementById('export-format').value;
        const quality = parseFloat(document.getElementById('export-quality').value);
        const filename = document.getElementById('export-filename').value || 'edited-image';
        
        let mimeType, extension;
        switch (format) {
            case 'png':
                mimeType = 'image/png';
                extension = 'png';
                break;
            case 'jpeg':
                mimeType = 'image/jpeg';
                extension = 'jpg';
                break;
            case 'webp':
                mimeType = 'image/webp';
                extension = 'webp';
                break;
            default:
                mimeType = 'image/png';
                extension = 'png';
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (format === 'jpeg') {
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        tempCtx.drawImage(this.canvas, 0, 0);
        
        const dataUrl = format === 'png' 
            ? tempCanvas.toDataURL(mimeType)
            : tempCanvas.toDataURL(mimeType, quality);
        
        const link = document.createElement('a');
        link.download = `${filename}.${extension}`;
        link.href = dataUrl;
        link.click();
        
        document.getElementById('export-modal').classList.add('hidden');
    }
    
    deselectAll() {
        this.selectedTextObject = null;
        this.selectedStickerObject = null;
    }
    
    reset() {
        if (!this.originalImage) return;
        
        this.currentImage = this.originalImage;
        this.textObjects = [];
        this.stickerObjects = [];
        
        this.resizeCanvas(this.originalImage.width, this.originalImage.height);
        this.ctx.drawImage(this.originalImage, 0, 0);
        
        document.getElementById('resize-width').value = this.originalImage.width;
        document.getElementById('resize-height').value = this.originalImage.height;
        
        this.updateImageInfo();
        this.saveState();
        this.render();
    }
}

// 初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
    const editor = new PhotoEditor();
});
