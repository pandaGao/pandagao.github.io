var app = {

	cvs: document.getElementById("cvs"),
	ctx: this.cvs.getContext('2d'),
	maskcvs: document.createElement('canvas'),
	pathTemp: [],
	pathList: [],
	colorCvs: null,
	mask: null,
	cvsSize: 0,
	drawing: false,
	lastPointerX: 0,
	lastPointerY: 0,
	
	/**
	 * 指针x坐标在画布上的偏移量
	 * @param  {number} x 
	 * @return {number} 偏移量
	 */
	offsetX: function(x) {
		return Math.ceil(x - this.cvs.offsetLeft)+0.5;
	},

	/**
	 * 指针y坐标在画布上的偏移量
	 * @param  {number} y
	 * @return {number} 偏移量
	 */
	offsetY: function(y) {
		return Math.ceil(y - this.cvs.offsetTop)+0.5;
	},

	/**
	 * 获取画笔颜色
	 * @return {string} 颜色值
	 */
	getPainterColor: function() {
		var input = document.querySelector("#color");
		return input.value;
	},

	/**
	 * 生成随机颜色值
	 * @return {rgba color object}
	 */
	randColor: function() {
		return {
			r: Math.floor(Math.random()*255),
			g: Math.floor(Math.random()*255),
			b: Math.floor(Math.random()*255),
			a: 255
		}
	},

	/**
	 * 将画布二值化
	 * @param {context} ctx
	 * @return {BinaryImage}
	 */
	toBinary: function(ctx) {
		var imageData = ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var binary = {
			height: this.cvsSize,
			width: this.cvsSize,
			data: []
		};
		var cSize = imageData.width * imageData.height * 4; 
		for (var i = 0;i<cSize;i+=4) {
			if (imageData.data[i] == 255 && imageData.data[i+1] == 255 && imageData.data[i+2] == 255 && imageData.data[i+3] != 0) {
				binary.data.push(0);
			} else if (imageData.data[i] >= 80) {
				binary.data.push(0);
			} else {
				binary.data.push(1);
			}
		}
		binary.data = new Uint8ClampedArray(binary.data);
		return binary;
	},

	/**
	 * 将画布区域化
	 * @param {context} ctx
	 * @return {LabelImage}
	 */
	toLabel: function(ctx) {
		var imageData = ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var label = {
			height: this.cvsSize,
			width: this.cvsSize,
			data: []
		};
		var cSize = imageData.width * imageData.height; 
		for (var i = 0;i<cSize;i++) {
			label.data.push(0);
		}
		return label;
	},

	/**
	 * 搜索并填充区域
	 */
	seedFilling: function() {
		var imageData = this.ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var binary = this.toBinary(this.ctx);
		var label = this.toLabel(this.ctx);
		var area = 0;
		var fillstyle = {};
		for (var i=0;i<this.cvsSize;i++) {
			for (var j=0;j<this.cvsSize;j++) {
				if (binary.data[i*binary.width+j] === 0 && label.data[i*label.width+j] === 0) {
					label.data[i*label.width+j] = ++area;
					var lStack = [];
					lStack.push([i,j]);
					fillstyle = this.randColor();
					while (lStack.length > 0) {
						var temp = lStack.shift();
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4] = fillstyle.r;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+1] = fillstyle.g;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+2] = fillstyle.b;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+3] = fillstyle.a;
						// top
						if ((temp[0]-1)>=0 && binary.data[(temp[0]-1)*binary.width+temp[1]] === 0 && label.data[(temp[0]-1)*label.width+temp[1]] === 0) {
							label.data[(temp[0]-1)*label.width+temp[1]] = area;
							lStack.push([(temp[0]-1),temp[1]]);
						}
						// left
						if ((temp[1]-1)>=0 && binary.data[temp[0]*binary.width+(temp[1]-1)] === 0 && label.data[temp[0]*label.width+(temp[1]-1)] === 0) {
							label.data[temp[0]*label.width+(temp[1]-1)] = area;
							lStack.push([temp[0],(temp[1]-1)]);
						}
						// bottom
						if ((temp[0]+1)<this.cvsSize && binary.data[(temp[0]+1)*binary.width+temp[1]] === 0 && label.data[(temp[0]+1)*label.width+temp[1]] === 0) {
							label.data[(temp[0]+1)*label.width+temp[1]] = area;
							lStack.push([(temp[0]+1),temp[1]]);
						}
						// right
						if ((temp[1]+1)<this.cvsSize && binary.data[temp[0]*binary.width+(temp[1]+1)] === 0 && label.data[temp[0]*label.width+(temp[1]+1)] === 0) {
							label.data[temp[0]*label.width+(temp[1]+1)] = area;
							lStack.push([temp[0],(temp[1]+1)]);
						}
					}
				}
			}
		}
		this.ctx.putImageData(imageData,0,0);
		this.redrawLine();
		this.colorCvs = this.ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
	},

	/**
	 * 重新绘制线条（为了平滑线条边缘）
	 */
	redrawLine: function() {
		for (var i=0;i<this.pathList.length;i++) {
			var tempList = this.pathList[i];
			this.ctx.beginPath();
			this.ctx.moveTo(tempList[0][0],tempList[0][1]);
			for (var j=1;j<tempList.length;j++) {
				this.ctx.lineTo(tempList[j][0],tempList[j][1]);
			}
			this.ctx.stroke();
		}
	},

	/**
	 * 像素化滤镜
	 * @param  {[type]} ctx [description]
	 */
	pixelFilter: function(ctx) {
		var imageData = ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var tileW = 4;
		var tileH = 4;
		var listW = this.cvsSize/tileW;
		var listH = this.cvsSize/tileH;
		for (var i=0;i<listW;i++) {
			for (var j=0;j<listH;j++) {
				var r = 0;
				var g = 0;
				var b = 0;
				for (var m=0;m<tileW;m++) {
					for (var n=0;n<tileH;n++) {
						r += imageData.data[((j*tileH+n)*this.cvsSize+i*tileW+m)*4];
						g += imageData.data[((j*tileH+n)*this.cvsSize+i*tileW+m)*4+1];
						b += imageData.data[((j*tileH+n)*this.cvsSize+i*tileW+m)*4+2];
					}
				}
				r /= tileW*tileH;
				g /= tileW*tileH;
				b /= tileW*tileH;
				ctx.fillStyle = 'rgb('+Math.ceil(r)+','+Math.ceil(g)+','+Math.ceil(b)+')';
				ctx.fillRect(i*tileW,j*tileH,tileW,tileH);
			}
		}
	},

	toPixel: function() {
		this.pixelFilter(this.ctx);
	},

	/**
	 * 设置蒙版
	 * @param {number} type 蒙版类型 0 无 1 圆形 2 三角形
	 */
	setMask: function(type) {
		var imageData = this.mask.createImageData(this.colorCvs);
		var cSize = imageData.width * imageData.height; 
		for (var i = 0;i<cSize;i++) {
			imageData.data[i*4] = this.colorCvs.data[i*4];
			imageData.data[i*4+1] = this.colorCvs.data[i*4+1];
			imageData.data[i*4+2] = this.colorCvs.data[i*4+2];
			imageData.data[i*4+3] = this.colorCvs.data[i*4+3];
		}
		this.mask.fillStyle = "#ffffff";
		this.mask.fillRect(0,0,this.cvsSize,this.cvsSize);
		this.mask.fillStyle = "#000000";
		switch(type) {
			case 1:
				this.mask.beginPath();
				this.mask.arc(this.cvsSize/2,this.cvsSize/2,this.cvsSize/2,0,2*Math.PI);
				this.mask.closePath();
				break;
			case 2:
				this.mask.beginPath();
				this.mask.moveTo(this.cvsSize/2,this.cvsSize/2-this.cvsSize*Math.sqrt(3)/4);
				this.mask.lineTo(0,this.cvsSize/2+this.cvsSize*Math.sqrt(3)/4);
				this.mask.lineTo(this.cvsSize,this.cvsSize/2+this.cvsSize*Math.sqrt(3)/4);
				this.mask.closePath();
				break;
			default:
				this.mask.beginPath();
				this.mask.rect(0,0,this.cvsSize,this.cvsSize);
				this.mask.closePath();
		}
		this.mask.fill();
		var bMask = this.toBinary(this.mask);
		for (var i=0;i<this.cvsSize;i++) {
			for (var j=0;j<this.cvsSize;j++) {
				if (bMask.data[i*bMask.width+j] == 0) {
					imageData.data[(i*this.cvsSize+j)*4] = 0;
					imageData.data[(i*this.cvsSize+j)*4+1] = 0;
					imageData.data[(i*this.cvsSize+j)*4+2] = 0;
					imageData.data[(i*this.cvsSize+j)*4+3] = 0;
				}
			}
		}
		this.ctx.putImageData(imageData,0,0);
	},

	/**
	 * 开始绘制笔触
	 * @param  {number} x - pointer x in page
	 * @param  {number} y - pointer y in page
	 */
	startDrawing: function(x,y) {
		// this.ctx.fillStyle = "#000000";
		// this.ctx.fillRect(this.offsetX(x-1),this.offsetY(y-1),3,3);
		// this.ctx.beginPath();
		this.lastPointerX = this.offsetX(x);
		this.lastPointerY = this.offsetY(y);
		this.ctx.lineWidth = 3;
		this.ctx.strokeStyle = this.getPainterColor();
		this.drawing = true;
		this.pathTemp = [];
		this.pathTemp.push([this.lastPointerX,this.lastPointerY]);
	},

	/**
	 * 结束绘制笔触
	 */
	finishDrawing: function() {
		this.drawing = false;
		this.pathList.push(this.pathTemp);
		this.pathTemp = [];
	},

	/**
	 * 移动时绘制笔触
	 * @param  {number} x - pointer x in page
	 * @param  {number} y - pointer y in page
	 */
	drawToPoint: function(x,y) {
		this.ctx.beginPath();
		this.ctx.moveTo(this.lastPointerX,this.lastPointerY);
		this.lastPointerX = this.offsetX(x);
		this.lastPointerY = this.offsetY(y);
		this.pathTemp.push([this.lastPointerX,this.lastPointerY]);
		this.ctx.lineTo(this.lastPointerX,this.lastPointerY);
		this.ctx.stroke();
	},

	/**
	 * 保存canvas到图片
	 */
	saveCanvas: function() {
		var image = document.createElement('img');
		image.src = this.cvs.toDataURL('image/png');
		document.body.appendChild(image);
		this.cvs.style.display = "none";
		image.style.marginLeft = -this.cvsSize/2+"px";
		image.style.marginTop = -this.cvsSize/2+"px";
	},

	/**
	 * 初始化应用
	 */
	init: function() {
		var w = window.innerWidth;
		var h = window.innerHeight;
		this.cvsSize = w>h ? h : w;
		this.cvs.width = this.cvsSize;
		this.cvs.height = this.cvsSize;
		this.maskcvs.width = this.cvsSize;
		this.maskcvs.height = this.cvsSize;
		this.mask = this.maskcvs.getContext('2d');
		this.cvs.style.marginLeft = -this.cvsSize/2+"px";
		this.cvs.style.marginTop = -this.cvsSize/2+"px";
		this.cvs.style.backgroundColor = "#ffffff";

		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0,0,this.cvsSize,this.cvsSize);

		this.cvs.addEventListener('mousedown',function(e){
			app.startDrawing(e.pageX,e.pageY);
		});
		this.cvs.addEventListener('mouseup',function(e) {
			app.finishDrawing();
		});
		this.cvs.addEventListener('mousemove',function(e) {
			if (app.drawing) {
				app.drawToPoint(e.pageX,e.pageY);
			}
			e.preventDefault();
		});
		cvs.addEventListener('touchstart',function(e) {
			var touch = e.targetTouches[0];
			app.startDrawing(touch.pageX,touch.pageY);
		});
		cvs.addEventListener('touchend',function(e) {
			app.finishDrawing();
		});
		cvs.addEventListener('touchmove',function(e) {
			if (app.drawing) {
				var touch = e.targetTouches[0];
				app.drawToPoint(touch.pageX,touch.pageY);
			}
			e.preventDefault();
		});
	}
};

app.init();