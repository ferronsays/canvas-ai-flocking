/*
Copyright (c) 2013 mikeferron.com, ferronsays at codepen.io (http://codepen.io/ferronsays)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

var flock;

BoidStyleEnum = {
    Square : 0,
    Line : 1,
    Circle : 2
};

settings = {
  BOIDS : 100,
  MAX_SPEED : 2,
  MAX_FORCE : 0.15,
  MAX_SIZE : 5,
  DESIRED_SEPARATION : 6,
  NEIGHBOR_RADIUS : 50,
  SEPARATION_WEIGHT : 2,
  ALIGNMENT_WEIGHT : 1,
  COHESION_WEIGHT : 1,
  AVOID_MOUSE : false,
  MOUSE_POSITION : null,
  MOUSE_RADIUS : 50,
  MOUSE_SIGN : -1,
  MOUSE_FORCE : 0.10,
  BOID_STYLE : 2,
  DRAW_TRAILS : true
};

//Thanks to http://harry.me/2011/02/17/neat-algorithms---flocking/ for the algorithm and vector class.
Flock = function(canvas_id) {
  this.init(canvas_id);
};

Flock.prototype.init = function(canvas_id) {

  this.current_time = new Date().getTime();
  this.dt = 0;
  this.canvas = document.getElementById(canvas_id);

  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;

  this.width = this.canvas.width;
  this.height = this.canvas.height;

  this.ctx = this.canvas.getContext('2d');

  this.ctx.clearRect(0, 0, this.width, this.height);
  this.ctx.fillStyle = '#333';
  this.ctx.fillRect(0, 0, this.width, this.height);

  this.boids = new Array();

  for(var i = 0; i < settings.BOIDS; i++)
  {
    var boid = new Boid(
      new Vector(Math.random() * this.width, Math.random() * this.height), 
      new Vector(Math.random(10), Math.random(10)),
      this.ctx);

    this.boids.push(boid);
  }
};

Flock.prototype.getCanvasContext = function() {
  return this.ctx;
};

Flock.prototype.enable = function() {
  var that = this;

  window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     
    })();

  this.animate(new Date().getTime());

  function doResize()
  {
    that.canvasResize();
  }

  var endResize;

  window.onresize = function(e) {
    clearTimeout(endResize);
    endResize = setTimeout(doResize, 100);
  };
  

  this.canvas.onmousemove = function(e){
    var mouseX, mouseY;
    if(e.offsetX) {
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    }
    else if(e.layerX) {
        mouseX = e.layerX;
        mouseY = e.layerY;
    }

    settings.MOUSE_POSITION = new Vector(mouseX, mouseY);
  }

  this.canvas.onmousedown = function(e)
  {
    if(e.which == 1 || e.which == 2 || e.button == 1)
      settings.AVOID_MOUSE = settings.AVOID_MOUSE ? false : true;
  }

  return this;
};

Flock.prototype.animate = function(time)
{
    var that = this;
    this.animationFrame = requestAnimFrame( function(){ that.animate(new Date().getTime());} );
    this.update(time);
};

Flock.prototype.disable = function() {
  
  window.cancelAnimationFrame(this.animationFrame);

  return this;
};

Flock.prototype.canvasResize = function()
{
  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;

  this.width = this.canvas.width;
  this.height = this.canvas.height;
};

Flock.prototype.update = function(time) {
  this.dt = time - this.current_time;

  this.current_time = time;

  this.draw();

  for (i in this.boids) {
    this.boids[i].step(this.boids);
    this.boids[i].draw();
  }

};

Flock.prototype.draw = function()
{
  if(!settings.DRAW_TRAILS)
    this.ctx.clearRect(0, 0, this.width, this.height);
  
  this.ctx.fillStyle = 'rgba(44, 62, 80, 0.3)';
  this.ctx.fillRect(0, 0, this.width, this.height); 

  if(settings.AVOID_MOUSE)
  {
    this.ctx.beginPath();
    this.ctx.arc(settings.MOUSE_POSITION.x, settings.MOUSE_POSITION.y, settings.MOUSE_RADIUS, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.fill();
  }
};

/*
*
* Boid
*
*/
Boid = function(location, velocity, ctx){
  this.init(location, velocity, ctx);
};

Boid.prototype.init = function(location, velocity, ctx){
  this.loc = location.duplicate();
  this.velocity = new Vector(Math.random()*2-1,Math.random()*2-1);
  this.ctx = ctx;
};

Boid.prototype.step = function(neighbors)
{
  var acceleration = this.flock(neighbors).add(this.influence());
  this.velocity.add(acceleration).limit(settings.MAX_SPEED);
  this.loc.add(this.velocity);
  this.wrapToCanvasBounds();
};

Boid.prototype.wrapToCanvasBounds = function()
{
  this.loc.x = this.loc.x < 0 ? this.ctx.canvas.width : this.loc.x;
  this.loc.x = this.loc.x > this.ctx.canvas.width ? 0 : this.loc.x;
  this.loc.y = this.loc.y < 0 ? this.ctx.canvas.height : this.loc.y;
  this.loc.y = this.loc.y > this.ctx.canvas.height ? 0 : this.loc.y;
};

Boid.prototype.flock = function(neighbors)
{
  var separation = this.separate(neighbors).multiply(settings.SEPARATION_WEIGHT);
  var alignment = this.align(neighbors).multiply(settings.ALIGNMENT_WEIGHT);
  var cohesion = this.cohere(neighbors).multiply(settings.COHESION_WEIGHT);

  return separation.add(alignment).add(cohesion);
};

Boid.prototype.cohere = function(neighbors){
  var sum = new Vector(0, 0);
  var count = 0;

  for(boid in neighbors)
  {
    var d = this.loc.distance(neighbors[boid].loc);
    if(d > 0 && d < settings.NEIGHBOR_RADIUS)
    {
        sum.add(neighbors[boid].loc);
        count++;
    }
  }

  if( count > 0)
    return this.steer_to(sum.divide(count));
  else
    return sum;
};

Boid.prototype.steer_to = function(target)
{
  var desired = Vector.subtract(target, this.loc);
  var d = desired.magnitude();
  var steer;

  if(d > 0)
  {
    desired.normalize();

    if(d < 100)
      desired.multiply(settings.MAX_SPEED*(d/100));
    else
      desired.multiply(settings.MAX_SPEED);

    steer = desired.subtract(this.velocity);
    steer.limit(settings.MAX_FORCE);
  }else{
    steer = new Vector(0, 0);
  }

  return steer;
};

Boid.prototype.align = function(neighbors){
  var mean = new Vector();
  var count = 0;
  for(boid in neighbors)
  {
    var d = this.loc.distance(neighbors[boid].loc);
    if(d > 0 && d < settings.NEIGHBOR_RADIUS)
    {
        mean.add(neighbors[boid].velocity);
        count++;
    }
  }

  if (count > 0)
    mean.divide(count)
  
  mean.limit(settings.MAX_FORCE);

  return mean;
};

Boid.prototype.separate = function(neighbors){
  var mean = new Vector();
  var count = 0;

  for(boid in neighbors)
  {
    var d = this.loc.distance(neighbors[boid].loc);
    if(d > 0 && d < settings.DESIRED_SEPARATION)
    {
        mean.add(Vector.subtract(this.loc, neighbors[boid].loc).normalize().divide(d));
        count++;
    }
  }

  if (count > 0)
    mean.divide(count);

  return mean;
};

//a catch-all function for outside influences on the boids
//just for avoiding the mouse force-field at this point.
//so i guess by 'catch-all' i meant 'catch-just-the-one-thing' :/
Boid.prototype.influence = function()
{
  var g = new Vector();

  if(settings.AVOID_MOUSE)
  {
    mouse = Vector.subtract(settings.MOUSE_POSITION, this.loc);
    d = mouse.magnitude() - settings.MOUSE_RADIUS;

    if (d < 0)
      d = 0.01;

    if (d > 0 && d < settings.NEIGHBOR_RADIUS * 5) 
      g.add(mouse.normalize().divide(d * d).multiply(settings.MOUSE_SIGN).limit(settings.MOUSE_FORCE));
  }

  return g;
};

Boid.prototype.draw = function(){

    var vv = (Math.abs(this.velocity.x) + Math.abs(this.velocity.y))/2;
    var color = "#ecf0f1";
    switch(settings.BOID_STYLE)
    {
      case BoidStyleEnum.Square:
        this.ctx.fillStyle = color;
        this.ctx.fillRect(this.loc.x, this.loc.y, Math.min(vv*5, settings.MAX_SIZE), Math.min(vv*5, settings.MAX_SIZE));
        break;
      case BoidStyleEnum.Line:
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(this.loc.x,this.loc.y);
        this.ctx.lineTo(this.loc.x + Math.min(this.velocity.x*5, settings.MAX_SIZE), this.loc.y + Math.min(this.velocity.y*5,settings.MAX_SIZE));
        this.ctx.stroke();
        break;
      case BoidStyleEnum.Circle:
        this.ctx.beginPath();
        this.ctx.arc(this.loc.x, this.loc.y, Math.min(vv*3, settings.MAX_SIZE), 0, 2 * Math.PI, false);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        break;
      default:
        this.ctx.beginPath();
        this.ctx.arc(this.loc.x, this.loc.y, Math.min(vv*3, settings.MAX_SIZE), 0, 2 * Math.PI, false);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        break;
    }
};





//adapted from https://github.com/hornairs/blog/blob/master/assets/coffeescripts/flocking/vector.coffee
Vector = (function() {
  var name, _fn, _i, _len, _ref;

  _ref = ['add', 'subtract', 'multiply', 'divide'];

  _fn = function(name) {
    return Vector[name] = function(a, b) {
      return a.duplicate()[name](b);
    };
  };

  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    name = _ref[_i];
    _fn(name);
  }

  function Vector(x, y) {

    if (x == null) 
      x = 0;
    
    if (y == null) 
      y = 0;

    this.x = x, this.y = y;
  }

  Vector.prototype.duplicate = function() {
    return new Vector(this.x, this.y);
  };

  Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  Vector.prototype.normalize = function() {
    var m;

    m = this.magnitude();

    if (m > 0) 
      this.divide(m);

    return this;
  };

  Vector.prototype.limit = function(max) {
    if (this.magnitude() > max) {
      this.normalize();

      return this.multiply(max);
    } else {

      return this;
    }
  };

  Vector.prototype.heading = function() {
    return -1 * Math.atan2(-1 * this.y, this.x);
  };

  Vector.prototype.eucl_distance = function(other) {
    var dx, dy;

    dx = this.x - other.x;
    dy = this.y - other.y;

    return Math.sqrt(dx * dx + dy * dy);
  };

  Vector.prototype.distance = function(other, dimensions) {
    var dx, dy;

    if (dimensions == null) 
      dimensions = false;
    

    dx = Math.abs(this.x - other.x);
    dy = Math.abs(this.y - other.y);

    if (dimensions) {
      dx = dx < dimensions.width / 2 ? dx : dimensions.width - dx;
      dy = dy < dimensions.height / 2 ? dy : dimensions.height - dy;
    }

    return Math.sqrt(dx * dx + dy * dy);
  };

  Vector.prototype.subtract = function(other) {
    this.x -= other.x;
    this.y -= other.y;

    return this;
  };

  Vector.prototype.add = function(other) {
    this.x += other.x;
    this.y += other.y;

    return this;
  };

  Vector.prototype.divide = function(n) {
    this.x = this.x/n, this.y = this.y/n;

    return this;
  };

  Vector.prototype.multiply = function(n) {
    this.x = this.x*n, this.y = this.y*n;

    return this;
  };

  Vector.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
  };

  Vector.prototype.projectOnto = function(other) {
    return other.duplicate().multiply(this.dot(other));
  };

  Vector.prototype.wrapRelativeTo = function(location, dimensions) {
    var a, d, key, map_d, v, _ref1;

    v = this.duplicate();
    _ref1 = {
      x: "width",
      y: "height"
    };

    for (a in _ref1) {
      key = _ref1[a];
      d = this[a] - location[a];
      map_d = dimensions[key];
      if (Math.abs(d) > map_d / 2) {
        if (d > 0) {
          v[a] = (map_d - this[a]) * -1;
        } else {
          v[a] = this[a] + map_d;
        }
      }
    }
    return v;
  };

  Vector.prototype.invalid = function() {
    return (this.x === Infinity) || isNaN(this.x) || this.y === Infinity || isNaN(this.y);
  };

  return Vector;

})();






function initialize() {
  flock = new Flock("c", settings.BOIDS);
  flock.enable();
}
      
window.onload = function() {
  settings.MOUSE_POSITION = new Vector(-9001,0); //over 9000!  just starting it off the screen

  initialize();

  document.getElementById('show-info').onmousedown = function(e) {
    document.getElementById('info').style.display = 'block';
    document.getElementById('show-info').style.display = 'none';
  };

  document.getElementById('close-info').onmousedown = function(e) {
    document.getElementById('info').style.display = 'none';
    document.getElementById('show-info').style.display = 'block';
  };

  document.getElementById('style').onchange = function(e) {
    settings.BOID_STYLE = parseFloat(this.value);
  };

  document.getElementById('trails').onchange = function(e) {
    settings.DRAW_TRAILS = this.checked;
  };

  document.getElementById('speed').onchange = function(e) {
    settings.MAX_SPEED = parseFloat(this.value);
  };

  document.getElementById('size').onchange = function(e) {
    settings.MAX_SIZE = parseFloat(this.value);
  };

  document.getElementById('force').onchange = function(e) {
    settings.MAX_FORCE = parseFloat(this.value);
  };

  document.getElementById('radius').onchange = function(e) {
    settings.NEIGHBOR_RADIUS = parseFloat(this.value);
  };

  document.getElementById('mouseRadius').onchange = function(e) {
    settings.MOUSE_RADIUS = parseFloat(this.value);
  };

  document.getElementById('mouseSign').onchange = function(e) {
    settings.MOUSE_SIGN = parseFloat(this.value);
  };

  document.getElementById('mouseForce').onchange = function(e) {
    settings.MOUSE_FORCE = parseFloat(this.value);
  };
};