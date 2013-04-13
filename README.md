#HTML5 Canvas-based Puppet Animation Rig for Sign Language

A Javascript API for drawing a stylized human figure in a limited range of specific poses.

The API provides for full control of the hands and face and limited control of the neck and shoulders.  The figure is shown from the waist up.

The goal of this project is to provide an easy to use means of delivering sign language content in a neutral, low-bandwidth form. Possible uses include:

- online sign language dictionaries or encyclopedias
- linguistic research or documentation

Feedback and pull requests are welcome.

[Sign Puppet Demo](http://aslfont.github.io/sign-puppet/demo/)

##Basic Usage

![This is the puppet in a neutral pose](http://github.com/aslfont/sign-puppet/raw/master/demo/default.png)

The draw method takes a canvas, width, height, x, y and the animation channel values that define the pose.

```html
<script type="text/javascript" src="sign-puppet.js" ></script>
<canvas id="the_canvas" width="600" height="400"></canvas>
<script>
  var canvas = document.getElementById('the_canvas');
  var puppet = aslfont.SignPuppet.create();
  var channels = {
    //animation channel values go here, for example:
    hry: -0.3
  };
  puppet.draw(canvas, canvas.width, canvas.height, 0, 0, channels);
</script>
```

There is also an API for animating the character from the current pose to a target pose.

```javascript
var animator = puppet.getAnimator();
//set up animation loop (in production use a requestAnimationFrame shim)
setInterval(
  function () {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    animator.tween();
    //if omitted, 'channels' defaults to the animator object's channels
    puppet.draw(canvas, canvas.width, canvas.height, 0, 0);
  },
  100 // 10 frames per second
);
//after 1.5 seconds, change the pose
setTimeout(
  function () {
    animator.setTarget({
      //animation channel values go here, for example:
      hry: -0.3
    });
  },
  1500 // 1.5 seconds
);
```

![This is the puppet in a few sample poses](http://github.com/aslfont/sign-puppet/raw/master/demo/action_small.png)


##Animation Channels

These are the default values for the animation channels:

```javascript
{
  //head and body
  hrx: 0, hry: 0, //neck rotation
  bx:  0, by:  0, //shoulder shift

  //eyes
  eby: 0, ebx: 0, e0y: 1, e1y: 1, //eyebrows, eyelids
  ex:  0, ey:  0, ez:  1,         //pupils

  //nose
  ny:  0, //nose wrinkle

  //mouth
  mx:  0, my:  0,                         //jaw, mouth shape
  mly: 0, mlz: 0, mty: 0, mtz: 0, mcx: 0, //lips, tongue, cheeks
  teeth: false,                           //teeth

  //right hand position
  rhx:  0, rhy:   0, rhz:  0, rh:   0, //location relative to head
  rbx:  0, rby:   1, rbz:  0, rb:   1, //location relative to body
  rax:  0, ray:   0, raz:  0, ra:   0, //location relative to other hand
  rpx:  0, rpy:   0, rpz:  0,          //pivot point
  rrz:  0, rrx: -90, rry:  0,          //rotation

  //right hand pose
  ri0:  0, ri1:  0, ri2:  0, ris:  0,          //index
  rm0:  0, rm1:  0, rm2:  0, rms:  0,          //middle
  rr0:  0, rr1:  0, rr2:  0, rrs:  0,          //ring
  rp0:  0, rp1:  0, rp2:  0, rps:  0,          //pinky
  rt0x: 0, rt0y: 0, rt1x: 0, rt1y: 0, rt2x: 0, //thumb

  //left hand position
  lhx:  0, lhy:   0, lhz:  0, lh:   0, //location relative to head
  lbx:  0, lby:   1, lbz:  0, lb:   1, //location relative to body
  lax:  0, lay:   0, laz:  0, la:   0, //location relative to other hand
  lpx:  0, lpy:   0, lpz:  0,          //pivot point
  lrz:  0, lrx: -90, lry:  0,          //rotation

  //left hand pose
  li0:  0, li1:  0, li2:  0, lis:  0,         //index
  lm0:  0, lm1:  0, lm2:  0, lms:  0,         //middle
  lr0:  0, lr1:  0, lr2:  0, lrs:  0,         //ring
  lp0:  0, lp1:  0, lp2:  0, lps:  0,         //pinky
  lt0x: 0, lt0y: 0, lt1x: 0, lt1y: 0, lt2x: 0 //thumb
}
```