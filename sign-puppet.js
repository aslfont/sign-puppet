// https://github.com/aslfont/sign-puppet
(function($) {

  var Animator, Model, Graphics, Capsule, Eye, Mouth, Pose, SignPuppet;

  /*
   * Animator
   * 
   * manages a set of channels and tweens their values toward target values
   */
  Animator = {
    create: function(channels) {
      return new Animator.instance(channels);
    },
    instance: $.Constructor(function (channels) {
      var k;
      this.target = {};
      this.channels = {};
      for (k in channels) {
        if (channels.hasOwnProperty(k)) {
          this.channels[k] = channels[k];
        }
      }
    }, {
      tween: function() {
        var self = this;
        $.each(this.target, function(k, v) {
          self.channels[k] += (v - self.channels[k]) / 2;
        });
      },
      setTarget: function(target) {
        var self = this;
        $.each(target, function(k, v) {
          if (typeof (self.target[k]) === 'number'
              || (self.target[k] === undefined
              && typeof (self.channels[k]) === 'number'
                  )
              ) {
            self.target[k] = v;
          } else {
            self.channels[k] = v;
          }
        });
      }
    })
  };

  /*
   * Model Class
   *
   * manages a set of shapes and the points that define them
   */
  Model = {
    nextShapeId: 0,
    capsule_mixin: {
      draw: function(g, channels, color, outline) {
        Capsule.draw(this, g, color, outline);
      }
    },
    create: function () {
      return new Model.instance();
    },
    instance: $.Constructor(function () {
      this.shapes = [];
      this.points = [];
    }, {
      addShape: function (s, asCapsule) {
        asCapsule = asCapsule !== false;
        s.id = Model.nextShapeId += 1;
        if (asCapsule) {
          s.smudges = s.smudges || [];
          s.draw = Model.capsule_mixin.draw;
        }
        this.shapes.push(s);
        return s;
      },
      addPoint: function(p) {
        p.orig_x = p.x;
        p.orig_y = p.y;
        p.orig_z = p.z;
        this.points.push(p);
        return p;
      },
      pose: function(x, y, poseModel) {
        var i, p;
        for (i = 0; i < this.points.length; i += 1) {
          p = this.points[i];
          p.x = p.orig_x;
          p.y = p.orig_y;
          p.z = p.orig_z;
        }

        poseModel();

        for (i = 0; i < this.points.length; i += 1) {
          p = this.points[i];
          p.x += x;
          p.y += y;
        }
      },
      draw: function (drawShape) {
        var i;
        for (i = 0; i < this.shapes.length; i += 1) {
          var s = this.shapes[i];
          Capsule.calculateCenter(s);
        }

        this.shapes.sort(function(a, b) {
          if ((a.layer || 0) !== (b.layer || 0)) {
            return (a.layer || 0) - (b.layer || 0);
          }
          if (a.center.z === b.center.z) {
            return a.id - b.id;
          }
          return a.center.z - b.center.z;
        });

        for (i = 0; i < this.shapes.length; i += 1) {
          drawShape(this.shapes[i]);
        }
      }
    })
  };


  /*
   * Graphics
   * 
   * wraps the methods of the 2d canvas context for convenience
   */
  Graphics = {
    create: function(context) {
      return new Graphics.instance(context);
    },
    instance: $.Constructor(function (context) {
      this.context = context;
    }, {
      drawLine: function(x, y, x2, y2, w, color) {
        var c = this.context;
        c.strokeStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x2 === x && y2 === y ? x2 + 1 : x2, y2);
        c.stroke();
      },
      drawCurve: function(x, y, x2, y2, x3, y3, w, color) {
        var c = this.context;
        c.strokeStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x2, y2, x3, y3);
        c.stroke();
      },
      drawShape: function(points, w, color, stroke) {
        var i;
        var c = this.context;
        c.strokeStyle = stroke || color;
        c.fillStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(points[0].x, points[0].y);
        for (i = 1; i < points.length; i += 1) {
          c.lineTo(points[i].x, points[i].y);
        }
        c.closePath();
        c.stroke();
        c.fill();
      },
      drawCurveShape: function(points, w, color, stroke) {
        var i;
        var c = this.context;
        c.strokeStyle = stroke || color;
        c.fillStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(points[0].x, points[0].y);
        for (i = 1; i < points.length - 1; i += 2) {
          c.quadraticCurveTo(
            points[i].x, points[i].y,
            points[i + 1].x, points[i + 1].y
          );
        }
        c.closePath();
        c.stroke();
        c.fill();
      },
      drawCone: function(x, y, x2, y2, w, w2, dx, dy, color) {
        var c = this.context;
        c.strokeStyle = color;
        c.fillStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x + dx, y + dy);
        c.lineTo(x - dx, y - dy);
        c.closePath();
        c.stroke();
        c.fill();

        c.beginPath();
        c.lineWidth = w2;
        c.moveTo(x, y);
        c.lineTo(x + 1, y);
        c.stroke();
      }
    })
  };

  /*
   * Capsule Class
   * 
   * renders to 2d simple shapes built from thick lines in 3d
   */
  Capsule = {
    drawCapsule: function(g, x, y, x2, y2, w, w2, t, color, outline) {
      if (w === w2) {
        g.drawLine(x, y, x2, y2, w, outline);
        g.drawLine(x, y, x2, y2, w - t * 2, color);
        return;
      }
      if (w > w2) {
        return this.drawCapsule(g, x2, y2, x, y, w2, w, t, color, outline);
      }
      var w3 = w  - t * 2;
      var w4 = w2 - t * 2;
      var d  = (w2 - w) / 2;
      var d2 = (w4 - w3) / 2;
      var dx = x2 - x;
      var dy = y2 - y;
      var a = Math.atan2(dy, dx) + Math.PI / 2;
      dx = Math.cos(a);
      dy = Math.sin(a);

      g.drawCone(x, y, x2, y2, w, w2, dx * d, dy * d, outline);
      g.drawCone(x, y, x2, y2, w3, w4, dx * d2, dy * d2, color);
    },
    drawPoints: function(g, points, w, t, w2, color, outline) {
      if (points.length === 2) {
        this.drawCapsule(
          g,
          points[0].x, points[0].y,
          points[1].x, points[1].y,
          w2 === undefined ? w : w2, w,
          t,
          color,
          outline
        );
        return;
      }
      g.drawShape(points, w, outline);
      g.drawShape(points, w - t * 2, color);
    },
    drawSmudge: function(g, x, y, x2, y2, w, w2, t, color) {
      var dx = x2 - x;
      var dy = y2 - y;
      var a = Math.atan2(dy, dx);
      t = Math.min(t, Math.sqrt(dx * dx + dy * dy));
      dx = Math.cos(a) * t;
      dy = Math.sin(a) * t;

      if (w === w2) {
        g.drawLine(x, y, x + dx, y + dy, w, color);
        return;
      }

      x2 = x + dx;
      y2 = y + dy;

      var d  = (w2 - w) / 2;
      dx = x2 - x;
      dy = y2 - y;
      a = Math.atan2(dy, dx) + Math.PI / 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
      if (w2 > w) {
        g.drawCone(x, y, x2, y2, w, w2, dx * d, dy * d, color);
      } else {
        g.drawCone(x2, y2, x, y, w2, w, dx * d, dy * d, color);
      }
    },
    draw: function(shape, g, color, outline) {
      var i;
      this.drawPoints(
        g,
        shape.points,
        shape.size,
        shape.border,
        shape.size2,
        color,
        outline
      );
      for (i = 0; i < shape.smudges.length; i += 1) {
        var smudge = shape.smudges[i];
        var w = smudge.size - shape.border * 2;
        this.drawSmudge(
          g,
          smudge.points[0].x, smudge.points[0].y,
          smudge.points[1].x, smudge.points[1].y,
          smudge.size2 ? smudge.size2 - shape.border * 2 : w,
          w,
          (smudge.scale || 2) * shape.border,
          color
        );
      }
    },
    calculateCenter: function(shape) {
      var i;
      var center = {x: 0, y: 0, z: 0};
      for (i = 0; i < shape.points.length; i += 1) {
        var point = shape.points[i];
        center.x += point.x;
        center.y += point.y;
        center.z += point.z;
      }
      center.x /= shape.points.length;
      center.y /= shape.points.length;
      center.z /= shape.points.length;
      shape.center = center;
    }
  };

  /*
   * Eye Class
   * 
   * renders a cartoon eye based on parameters
   */
  Eye = {
    create: function (points, side, scale) {
      return new Eye.instance(points, side, scale);
    },
    instance: $.Constructor(function (points, side, scale) {
      this.points = points;
      this.side   = side;
      this.scale  = scale;
    }, {
      draw: function (g, vars, color, outline, pupilColor) {
        var s = this.scale;
        var side = this.side;
        var x0 = this.points[0].x;

        var y0 = this.points[0].y;

        var eyeSize = 15 * s * vars.ez;
        var upperLidHeight = Math.max(0, 0.85 * vars.e0y);
        var lowerLidHeight = Math.max(0, 0.95 * vars.e1y);
        g.drawLine(x0,  y0, x0 + 1, y0, eyeSize + 3 * s, outline);
        g.drawLine(x0,  y0, x0 + 1, y0, eyeSize, '#fff');

        //pupil
        var pupilx = x0 + 2 * s * vars.hry + 3 * s * vars.ex;
        var pupily = y0 - 3 * s * vars.ey;
        g.drawLine(
          pupilx,     pupily,
          pupilx + 1, pupily,
          9 * s,
          pupilColor
        );

        //lid
        g.drawLine(
          x0 - side * eyeSize / 3, y0 - upperLidHeight * eyeSize - 3 * s * vars.ey,
          x0 + side * eyeSize / 3, y0 - upperLidHeight * eyeSize - 3 * s * vars.ey,
          eyeSize + 3 * s,
          color
        );

        g.drawLine(
          x0 - side * eyeSize / 3, y0 + lowerLidHeight * eyeSize - 3 * s * vars.ey,
          x0 + side * eyeSize / 3, y0 + lowerLidHeight * eyeSize - 3 * s * vars.ey,
          eyeSize + 3 * s,
          color
        );

        var opened = vars.e0y + vars.e1y;
        if (opened < 3 / 5) {
          g.drawLine(
            x0 - side * eyeSize / 2,  y0,
            x0 + side * eyeSize / 2,  y0,
            3 * s,
            outline
          );
          if (vars.e1y < 0) {
            g.drawCurve(
              x0 - side * eyeSize / 2, y0 + 3 * s,
              x0, y0,
              x0 + side * eyeSize / 2, y0 + 3 * s,
              3 * s,
              outline
            );
          }
        }

        //brow
        var x1 = x0 + 15 * s * side;
        var x2 = x0;
        var x3 = x0 - 10 * s * side;
        var y1 = y0 - 16 * s;
        var y2 = y0 - 19 * s;
        var y3 = y0 - 18 * s;
        var up   =  Math.max(0, vars.eby);
        var down = -Math.min(0, vars.eby);

        y1 -=  9 * s * (vars.eby - up * vars.ebx);
        y2 -=  8 * s * (vars.eby - vars.ebx)
            +  5 * s * vars.ebx * up;
        y3 -= 10 * s * vars.eby + 5.5 * s * down;
        x2 -= side * up * vars.ebx * 5 * s;
        x2 -= side * down * 15 * s;
        x1 -= side * down * 8 * s;

        g.drawCurve(x1, y1, x2, y2, x3, y3, 3 * s, outline);

      }
    })
  };

  /*
   * Mouth Class
   * 
   * renders a cartoon mouth based on parameters
   */
  Mouth = {
    create: function (points, scale) {
      return new Mouth.instance(points, scale);
    },
    instance: $.Constructor(function(points, scale) {
      this.points = points;
      this.scale  = scale;
    }, {
      draw: function (g, vars, color, outline) {
        var s = this.scale;

        var height = (this.points[0].y + this.points[1].y) / 2;
        var center = (this.points[0].x + this.points[1].x) / 2;
        var width = Math.abs(this.points[0].x - this.points[1].x);
        var wide = vars.mx * width / 2 * s;

        if (vars.mlz > 0.25) {
          wide = -6 * s;
          height -= 4 * s;
        }

        var x1 = center - Math.max(1, width / 2 + wide);
        var x2 = center + Math.max(1, width / 2 + wide);

        if (vars.mlz > 0.25) {
          g.drawCurve(x1, height - 4 * s, center, height - 8 * s, x2, height - 4 * s, 3 * s, outline);
          g.drawCurve(x1, height + 6 * s, center, height + 10 * s, x2, height + 6 * s, 3 * s, outline);
        }

        if (vars.mlz < -0.25 || vars.mlz > 0.25) {
          g.drawLine(x1, height, x2, height, 3 * s, outline);
          g.drawLine(x1, height - 2 * s, x1, height + 2 * s, 3 * s, outline);
          g.drawLine(x2, height - 2 * s, x2, height + 2 * s, 3 * s, outline);
          return;
        }

        var lineWidth = 5 * s + 2 * s * Math.abs(vars.mx) / 25 * s;

        var open = x2 - x1 > 2 * s ? vars.my : 0;
        var mood = x2 - x1 > 2 * s ? vars.mly : 0;

        //mouth shapes
        var shift = -5 * s * open - 5 * s * open * (1 - Math.abs(mood));
        height += shift;
        var size = 5 + Math.abs(shift * 2);
        var y1 = size * Math.min(0, open - vars.mly);
        var y0 = size * (mood - 1) / 2 * Math.max(open, Math.abs(mood));
        var y2 = size * (y1 / size - open);

        var fill = vars.teeth ? '#fff' : outline;
        g.drawCurveShape([
          {x: x1,     y: height - y0},
          {x: center, y: height - y1},
          {x: x2, y: height - y0},
          {x: center, y: height - y2},
          {x: x1, y: height - y0}
        ], lineWidth, fill, outline);

        if (vars.teeth) {
          g.drawLine(x1, height - y0, x2, height - y0, 2 * s, outline);
        }

        if (vars.mtz > 0.25) {
          var y = vars.mty > 0
            ? height - y0 - (y2 - y0) * vars.mty
            : height - y0 + (y1 - y0) * vars.mty;
          g.drawLine((x1 + center) / 2, y, (x2 + center) / 2, y, 8 * s,  outline);
          g.drawLine((x1 + center) / 2, y, (x2 + center) / 2, y, 3 * s,  color);
        }

      }
    })
  };

  /*
   * Pose Class
   * 
   * methods for rotating and moving sets of 3d points
   */
  Pose = {
    poseElbow: function(side, points, armLength) {
      var pt0 = points[0];
      var pt1 = points[1];
      var pt2 = points[2];

      var dx  = pt2.x - pt0.x;
      var dy  = pt2.y - pt0.y;
      var dz  = pt2.z - pt0.z;

      var dxz = Math.sqrt(dx * dx + dz * dz);
      var ay  = Math.atan2(dz, dx);

      var d   = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var a   = Math.atan2(dy, dxz);

      pt1.x = pt0.x;
      pt1.y = pt0.y + Math.sqrt(Math.max(0, armLength * armLength - d / 2 * d / 2));
      pt1.z = pt0.z + d / 2;

      Pose.rotateZXY([pt1], pt0, -side * Math.PI / 3, -a, -Math.PI / 2 + ay);
    },
    rotateThumb: function(side, points, ang0x, ang0y, ang1x, ang1y, ang2x) {
      var cos   = Math.cos;
      var sin   = Math.sin;

      var p0 = points[0];
      var p1 = points[1];
      var p2 = points[2];
      var p3 = points[3];

      p1.x = p0.x + side * p1.d * sin(ang0y);
      p1.y = p0.y + p1.d * cos(ang0y) * sin(ang0x);
      p1.z = p0.z + side * p1.d * cos(ang0y) * cos(ang0x);

      p2.x = p1.x + side * p2.d * sin(ang1y);
      p2.y = p1.y + p2.d * cos(ang1y) * sin(ang1x);
      p2.z = p1.z + side * p2.d * cos(ang1y) * cos(ang1x);

      p3.x = p2.x + side * p3.d * cos(ang2x) * sin(ang1y);
      p3.y = p2.y + p3.d * sin(ang2x);
      p3.z = p2.z + side * p3.d * cos(ang2x) * cos(ang1y);

    },
    rotateY3: function(points, ang0, ang1, ang2, yshift) {
      var cos   = Math.cos;
      var sin   = Math.sin;

      ang1 += ang0;
      ang2 += ang1;

      var p0 = points[0];
      var p1 = points[1];
      var p2 = points[2];
      var p3 = points[3];

      p1.x = p0.x + p1.d * cos(ang0);
      p1.z = p0.z + p1.d * sin(ang0);

      p2.x = p1.x + p2.d * cos(ang1);
      p2.z = p1.z + p2.d * sin(ang1);

      p3.x = p2.x + p3.d * cos(ang2);
      p3.z = p2.z + p3.d * sin(ang2);

      p3.y += yshift;
      p2.y += yshift * 2 / 3;
      p1.y += yshift / 3;

    },
    rotateXY: function (points, pivot, angx, angy) {
      var i;
      var sqrt  = Math.sqrt;
      var atan2 = Math.atan2;
      var cos   = Math.cos;
      var sin   = Math.sin;

      var a, d, p;
      for (i = 0; i < points.length; i += 1) {
        p = points[i];
        p.x -= pivot.x;
        p.y -= pivot.y;
        p.z -= pivot.z;

        d   = sqrt(p.y * p.y + p.z * p.z);
        a   = atan2(p.z, p.y);
        p.y = d * cos(a + angx);
        p.z = d * sin(a + angx);

        d   = sqrt(p.x * p.x + p.z * p.z);
        a   = atan2(p.z, p.x);
        p.x = d * cos(a + angy);
        p.z = d * sin(a + angy);

        p.x += pivot.x;
        p.y += pivot.y;
        p.z += pivot.z;
      }
    },
    rotateZXY: function(points, pivot, angz, angx, angy) {
      var i;
      var sqrt  = Math.sqrt;
      var atan2 = Math.atan2;
      var cos   = Math.cos;
      var sin   = Math.sin;

      var a, d, p;
      for (i = 0; i < points.length; i += 1) {
        p = points[i];
        p.x -= pivot.x;
        p.y -= pivot.y;
        p.z -= pivot.z;

        d   = sqrt(p.x * p.x + p.y * p.y);
        a   = atan2(p.y, p.x);
        p.x = d * cos(a + angz);
        p.y = d * sin(a + angz);

        d   = sqrt(p.y * p.y + p.z * p.z);
        a   = atan2(p.z, p.y);
        p.y = d * cos(a + angx);
        p.z = d * sin(a + angx);

        d   = sqrt(p.x * p.x + p.z * p.z);
        a   = atan2(p.z, p.x);
        p.x = d * cos(a + angy);
        p.z = d * sin(a + angy);

        p.x += pivot.x;
        p.y += pivot.y;
        p.z += pivot.z;
      }
    },
    move: function(points, pivot, target) {
      var i;
      var dx = target.x - pivot.x;
      var dy = target.y - pivot.y;
      var dz = target.z - pivot.z;

      var p;
      for (i = 0; i < points.length; i += 1) {
        p = points[i];
        p.x += dx;
        p.y += dy;
        p.z += dz;
      }
    },
    moveBy: function(points, amounts, factor) {
      var i;
      var dx = amounts.x * factor;
      var dy = amounts.y * factor;
      var dz = amounts.z * factor;

      var p;
      for (i = 0; i < points.length; i += 1) {
        p = points[i];
        p.x += dx;
        p.y += dy;
        p.z += dz;
      }
    },
    shiftX: function (points, amount, factor) {
      var i;
      for (i = 0; i < points.length; i += 1) {
        points[i].x += amount * $.defaultTo(points[i][factor], 1);
      }
    },
    shiftY: function(points, amount, factor) {
      var i;
      for (i = 0; i < points.length; i += 1) {
        points[i].y += amount * (points[i][factor] || 1);
      }
    },
    zoomDistort: function(points, pivot, factor) {
      var i;
      for (i = 0; i < points.length; i += 1) {
        var zoom = 1 + points[i].z * factor;
        points[i].x = pivot.x + (points[i].x - pivot.x) * zoom;
        points[i].y = pivot.y + (points[i].y - pivot.y) * zoom;
      }
    }
  };

  /*
   * SignPuppet Class
   * 
   * main class for the humanoid puppet - building, posing and rendering
   */
  SignPuppet = {
    channels: {
      hrx: 0, hry: 0, bx:  0, by:  0,
      
      eby: 0, ebx: 0, e0y: 1, e1y: 1,
      ex:  0, ey:  0, ez:  1,
      
      ny:  0,
      
      mx:  0, my:  0,
      mly: 0, mlz: 0, mty: 0, mtz: 0, mcx: 0,
      teeth: 0,
      
      rhx:  0, rhy:   0, rhz:  0, rh:   0,
      rbx:  0, rby:   1, rbz:  0, rb:   1,
      rax:  0, ray:   0, raz:  0, ra:   0,
      rpx:  0, rpy:   0, rpz:  0,
      rrz:  0, rrx: -90, rry:  0,
      
      ri0:  0, ri1:  0, ri2:  0, ris:  0,
      rm0:  0, rm1:  0, rm2:  0, rms:  0,
      rr0:  0, rr1:  0, rr2:  0, rrs:  0,
      rp0:  0, rp1:  0, rp2:  0, rps:  0,
      rt0x: 0, rt0y: 0, rt1x: 0, rt1y: 0, rt2x: 0,
      
      lhx:  0, lhy:   0, lhz:  0, lh:   0,
      lbx:  0, lby:   1, lbz:  0, lb:   1,
      lax:  0, lay:   0, laz:  0, la:   0,
      lpx:  0, lpy:   0, lpz:  0,
      lrz:  0, lrx: -90, lry:  0,
      
      li0:  0, li1:  0, li2:  0, lis:  0,
      lm0:  0, lm1:  0, lm2:  0, lms:  0,
      lr0:  0, lr1:  0, lr2:  0, lrs:  0,
      lp0:  0, lp1:  0, lp2:  0, lps:  0,
      lt0x: 0, lt0y: 0, lt1x: 0, lt1y: 0, lt2x: 0

    },
    getProportions: function (scale) {
      var border, headHeight, bodyHeight, palmWidth,
        headRadius, chinRadius, fingerRadius, palmRadius,
        headDepth, chinDepth, noseDepth;
      var k, i;
      var props = {
        border              : border = 5,
        thinBorder          : 3,
        headHeight          : headHeight = 270,
        foreheadHeight      : headHeight + 50,
        eyeHeight           : headHeight + 35,
        noseHeight          : headHeight + 15,
        noseWidth           : 5,
        nostrilWidth        : 5,
        cheekWidth          : 25,
        cheekHeight         : headHeight + 5,
        mouthHeight         : headHeight - 5,
        mouthWidth          : 30,
        chinHeight          : headHeight + 20,
        neckWidth           : 60,
        bodyHeight          : bodyHeight = 200,
        waistWidth          : 90,
        shoulderWidth       : 45,
        shoulderHeight      : bodyHeight - 5,
        elbowHeight         : 80,
        lowerArmLength      : 100,
        wristLength         : 10,
        palmHeight          : 25,
        palmWidth           : palmWidth = 25,
        knuckleHeight       : 16,
        thumbKnuckles       : [0, 15, 30, 45],
        knuckleProportions  : [1, 0.8, 0.7],
        fingerProportions   : [1, 1.2, 1, 0.7],
        fingerSpread        : 15,

        bodyRadius          : 60,
        headRadius          : headRadius = 115,
        chinRadius          : chinRadius = 105,
        mouthScale          : 1,
        cheekRadius         : 45,
        noseRadius          : 13,
        nostrilRadius       : 10,
        eyeScale            : 1,
        armRadius           : 50,
        wristRadius         : 35,
        fingerRadius        : fingerRadius = 16,
        palmRadius          : palmRadius =
            border + 4 * (fingerRadius - border + 1) - palmWidth,
        thumbRadii          : [palmRadius, 22, 18, 18],

        shoulderDepth       : 100,
        headDepth           : headDepth = 15,
        chinDepth           : chinDepth = 30,
        cheekDepth          : 50,
        noseDepth           : noseDepth =
            (headDepth + chinDepth) / 2 + (headRadius / 2 + chinRadius / 2) / 2,
        nostrilDepth        : noseDepth - 4,
        eyeSpacing          : 40,
        eyeDepth            : noseDepth - 15,
        mouthDepth          : noseDepth - 10,
        thumbDepth          : 5,

        bodyShiftAmount     : 50,
        shoulderShrugAmount : 30,
        noseCrinkleAmount   : 5,
        jawAmount           : 25
      };
      for (k in props) {
        if (props.hasOwnProperty(k)) {
          if (typeof props[k] === 'number') {
            props[k] *= scale;
          } else if (!k.match(/Proportions$/)) {
            for (i = 0; i < props[k].length; i += 1) {
              props[k][i] *= scale;
            }
          }
        }
      }
      return props;
    },

    build: function(p, model) {
      var b = {
        headPoints: [],
        nosePoints: [],
        bodyPoints: []
      };
      var headPoint = function(x, y, z) {
        var pt = model.addPoint({x: x, y: y, z: z});
        b.headPoints.push(pt);
        return pt;
      };
      var nosePoint = function(x, y, z, f) {
        var pt = headPoint(x, y, z);
        pt.crinkleFactor = f;
        b.nosePoints.push(pt);
        return pt;
      };
      var bodyPoint = function(x, y, z, f, ff) {
        var pt = model.addPoint({x: x, y: y, z: z});
        pt.shrugFactor = f;
        pt.shiftFactor = ff;
        b.bodyPoints.push(pt);
        return pt;
      };

      (function (x, y, z) {
        b.leftTarget  = bodyPoint(x,  y, z);
        b.rightTarget = bodyPoint(-x, y, z);
      }(p.waistWidth / 2 + p.bodyRadius, -p.bodyHeight / 2, 0));

      // torso
      b.torso = (function (torso) {
        return torso(p.waistWidth / 2, -p.bodyHeight, -201);
      }(function (x, y, z) {
        return model.addShape({
          points: [
            bodyPoint(-x, y, z, 0.25),
            bodyPoint(-x, 0, z,   0, 0.25),
            bodyPoint(x,  0, z,   0, 0.25),
            bodyPoint(x,  y, z, 0.25)
          ],
          border: p.border,
          size:   p.bodyRadius,
          layer:  -5,
          color:  1
        });
      }));

      // neck
      b.neck = (function(neck) {
        var point = function (y, shiftFactor) {
          return bodyPoint(0, y, -200, shiftFactor);
        };
        return neck([
          point(-p.bodyHeight - p.bodyRadius / 2, 0.5),
          point(-p.headHeight, 0)
        ]);
      }(function (pts) {
        return model.addShape({
          points:    pts,
          border:    p.border,
          size:      p.neckWidth,
          layer:     -3
        });
      }));

      // head
      b.head = model.addShape({
        points: [
          headPoint(0, -p.chinHeight,     -100 + p.chinDepth),
          headPoint(0, -p.foreheadHeight, -100 + p.headDepth)
        ],
        border:      p.border,
        size:        p.chinRadius,
        size2:       p.headRadius,
        layer:       -2,
        leftTarget:  headPoint(0, -p.noseHeight, 0),
        rightTarget: headPoint(0, -p.noseHeight, 0)
      });

      b.headPivot = bodyPoint(b.neck.points[1].x, b.neck.points[1].y, -100);

      // eyes
      (function (x, y, z) {
        (function (eye) {
          b.leftEye  = eye(1);
          b.rightEye = eye(-1);
        }(function(side) {
          var pts = [headPoint(side * x, y, z)];
          var shape = model.addShape(Eye.create(pts, side, p.eyeScale), false);
          shape.layer = -1;
          return shape;
        }));
      }(p.eyeSpacing / 2, -p.eyeHeight, -100 + p.eyeDepth));

      // nose
      b.nose = (function (x, y, z) {
        var n = model.addShape({
          points: [
            nosePoint(-x, y, z, 0.5),
            nosePoint(x,  y, z, 0.5)
          ],
          size:   p.noseRadius,
          border: p.thinBorder,
          layer:  -1
        });

        (function (x2, dx, y2, z2) {
          (function (nostril) {
            b.leftNostril  = nostril(1);
            b.rightNostril = nostril(-1);
          }(function (side) {
            return model.addShape({
              points: [
                nosePoint(side * (x2 + dx), y2, z2),
                nosePoint(side * (x2 + dx + 1), y2, z2)
              ],
              size:   p.nostrilRadius,
              border: p.thinBorder,
              layer:  -1
            });
          }));
        }(x, p.nostrilWidth, y, -100 + p.nostrilDepth));

        return n;
      }(p.noseWidth / 2, -p.noseHeight, -100 + p.noseDepth));

      // cheeks
      b.cheeks = (function (x, y, z) {
        return model.addShape({
          points: [
            headPoint(-x, y, z),
            headPoint(x,  y, z)
          ],
          border: p.border,
          size:   p.cheekRadius,
          layer:  -2,
          smudges: [{
            points: b.head.points,
            scale:  50,
            size:   p.chinRadius,
            size2:  p.headRadius
          }]
        });
      }(p.cheekWidth, -p.cheekHeight, -100 + p.cheekDepth));

      // mouth
      b.mouth = (function (x, y, z) {
        var pts = [
          headPoint(-x, y, z),
          headPoint(x,  y, z)
        ];
        var shape = model.addShape(Mouth.create(pts, p.mouthScale), false);
        shape.layer = -1;
        return shape;
      }(p.mouthWidth / 2, -p.mouthHeight, -100 + p.mouthDepth));

      b.mouth.color = 2;

      // arm
      (function(arm) {
        b.leftArm  = arm(1);
        b.rightArm = arm(-1);
      }(function(side) {
        var s = side > 0;
        var a = {
          handPoints: [],
          armPoints: []
        };
        var armPoint = function(x, y, z) {
          var pt = model.addPoint({x: x, y: y, z: z});
          a.armPoints.push(pt);
          return pt;
        };
        var handPoint = function(x, y, z, d) {
          var pt = model.addPoint({x: x, y: y, z: z});
          pt.d = d;
          a.handPoints.push(pt);
          return pt;
        };

        (function (x, y, z) {
          a.handPivot     = model.addPoint({x: x, y: y, z: z});
          a.handMove      = model.addPoint({x: x, y: y, z: z});
          a.handTarget    = handPoint(x, y, z);
        }(
          side * (p.waistWidth / 2 + p.bodyRadius + p.lowerArmLength),
          -p.elbowHeight,
          0
        ));

        a.shoulder = (function(shoulder) {
          return shoulder(
            b.torso.points[s ? 3 : 0],
            armPoint(
              side * (p.waistWidth / 2 + p.shoulderWidth),
              -p.shoulderHeight,
              -p.shoulderDepth
            )
          );
        }(function (pt0, pt1) {
          b.bodyPoints.push(pt1);
          var shoulder = model.addShape({
            points: [
              pt0,
              pt1
            ],
            border: p.border,
            size: p.bodyRadius,
            size2: p.armRadius,
            layer: -4,
            color: 1
          });
          (function (smudge) {
            smudge(b.torso.points[s ? 0 : 3]);
            smudge(b.torso.points[s ? 2 : 1]);
          }(function(pt) {
            return shoulder.smudges.push({
              scale: 4,
              size: p.bodyRadius,
              points: [pt0, pt]
            });
          }));
          return shoulder;
        }));

        a.upper = model.addShape({
          points: [
            a.shoulder.points[1],
            armPoint(
              side * (p.waistWidth / 2 + p.bodyRadius), -p.elbowHeight, 0
            )
          ],
          border: p.border,
          size: p.armRadius,
          size2: p.armRadius,
          color: 1,
          layer: -3,
          smudges: [{
            size: p.armRadius,
            points: [a.shoulder.points[1], a.shoulder.points[0]]
          }]
        });

        a.lower = model.addShape({
          points: [
            a.upper.points[1],
            handPoint(
              a.handPivot.x,
              a.handPivot.y,
              a.handPivot.z - p.wristLength
            )
          ],
          border: p.border,
          size: p.armRadius,
          size2: p.wristRadius,
          color: 1,
          smudges: [{
            size: p.armRadius,
            points: [a.upper.points[1], a.upper.points[0]]
          }]
        });
        a.armPoints.push(a.lower.points[1]);

        a.palm = (function(palm) {
          return palm(
            a.handPivot.x,
            a.handPivot.y, p.palmWidth / 2,
            0, p.palmHeight
          );
        }(function(x, y, dy, z, dz) {
          return model.addShape({
            points: [
              handPoint(x, y + dy, z),
              handPoint(x, y - dy, z),
              handPoint(x, y - dy, z + dz),
              handPoint(x, y + dy, z + dz)
            ],
            border: p.border,
            size: p.palmRadius
          });
        }));

        (function(fingers) {
          fingers(
            a.handPivot.x,
            a.handPivot.y,
            p.palmHeight  + p.palmRadius / 2 - p.fingerRadius / 2,
            p.knuckleHeight,
            p.palmWidth / 2 + p.palmRadius / 2 - p.fingerRadius / 2,
            p.fingerProportions
          );
        }(function (x, y, z, dz, spread, props) {
          (function (finger) {
            finger('index',  x, y - spread,     z, props[0]);
            finger('middle', x, y - spread / 3, z, props[1]);
            finger('ring',   x, y + spread / 3, z, props[2]);
            finger('pinky',  x, y + spread,     z, props[3]);
          }(function (name, x, y, z, size) {
            var points = [];
            var point = function (i) {
              var d = i && side * size * dz * p.knuckleProportions[i - 1];
              var pt = handPoint(x, y, z + i * d, d);
              points.push(pt);
              return pt;
            };

            a[name] = (function (knuckle) {
              var k = null;
              var knuckles = [];
              knuckles.push(k = knuckle([point(0),    point(1)], k));
              knuckles.push(k = knuckle([k.points[1], point(2)], k));
              knuckles.push(k = knuckle([k.points[1], point(3)], k));
              return {
                knuckles: knuckles,
                points:   points
              };
            }(function (pts, previous) {
              var current = model.addShape({
                points: pts,
                border: p.border,
                size: p.fingerRadius
              });
              (function (smudge) {
                if (previous) {
                  smudge(current,  [previous.points[1], previous.points[0]]);
                  smudge(previous, [current.points[0],  current.points[1]]);
                } else {
                  var pt = handPoint(x, y, z - dz);
                  smudge(current, [current.points[0], pt]);
                  a.palm.smudges.push({
                    points: [pt, current.points[1]],
                    size: p.fingerRadius,
                    scale: 5
                  });
                }
              }(function (knuckle, points) {
                knuckle.smudges.push({
                  size:   p.fingerRadius,
                  points: points
                });
              }));
              return current;
            }));
          }));
        }));

        a.thumb = (function (knuckle) {
          var knuckles = [];
          var points = [];
          var point = function (i) {
            var d = p.thumbKnuckles[i] - p.thumbKnuckles[i - 1];
            var pt = handPoint(
              a.handPivot.x - side * p.thumbDepth,
              a.handPivot.y - p.palmWidth * 0.55,
              p.thumbKnuckles[0],
              side * d
            );
            points.push(pt);
            return pt;
          };
          var k = null;
          knuckles.push(k = knuckle(0, [point(0),    point(1)], k));
          knuckles.push(k = knuckle(1, [k.points[1], point(2)], k));
          knuckles.push(k = knuckle(2, [k.points[1], point(3)], k));
          return {
            knuckles: knuckles,
            points: points
          };
        }(function (i, pts, previous) {
          var current = model.addShape({
            points: pts,
            border: p.border,
            size: p.thumbRadii[i],
            size2: p.thumbRadii[i + 1]
          });
          (function (smudge) {
            if (previous) {
              smudge(current,  [previous.points[1], previous.points[0]], -1);
              smudge(previous, [current.points[0],  current.points[1]],   1);
            } else {
              smudge(current, [a.palm.points[1], a.palm.points[0]], 0);
              smudge(current, [a.palm.points[1], a.palm.points[2]], 0);
              smudge(a.palm, [current.points[0], a.palm.points[1]], 0);
            }
          }(function (shape, points, di) {
            shape.smudges.push({
              points: points,
              size:   p.thumbRadii[i],
              size2:  p.thumbRadii[i + di]
            });
          }));
          return current;
        }));
        return a;
      }));
      return b;
    },

    create: function() {
      return new SignPuppet.instance();
    },

    instance: $.Constructor(function () {
      this.graphics = Graphics.create(null);
      this.fillColors = ['#ccc', '#888',  '#ccc'];
      this.outlineColor = '#555';
    }, {

      getAnimator: function () {
        return this.animator || this.setAnimator(Animator.create(SignPuppet.channels));
      },

      setAnimator: function(animator) {
        this.animator = animator;
        return animator;
      },

      draw: function (canvas, w, h, x, y, channels) {
        var self = this;

        channels = channels || (this.animator ? this.animator.channels : {});

        for (k in SignPuppet.channels) {
          if (channels[k] === undefined) {
            channels[k] = SignPuppet.channels[k];
          }
        }
        
        
        w = w || canvas.width;
        h = h || canvas.height;

        var scale = Math.min(w / 600, h / 400);
        if (scale !== this.scale) {
          this.buildModel(scale);
        }

        var model = this.model;
        model.pose((x || 0) + w / 2, (y || 0) + h, function () {
          self.pose(channels);
        });

        var context = canvas.getContext('2d');
        context.lineJoin = 'round';
        context.lineCap = 'round';

        self.graphics.context = context;
        model.draw(function (shape) {
          shape.draw(
            self.graphics,
            channels,
            self.fillColors[shape.color || 0],
            self.outlineColor,
            self.outlineColor
          );
        });
      },

      buildModel: function (scale) {
        this.scale = scale;
        this.model = Model.create();
        this.proportions = SignPuppet.getProportions(scale);
        this.body = SignPuppet.build(this.proportions, this.model);
      },

      pose: function(vars) {
        var p        = this.proportions;
        var body     = this.body;
        var leftArm  = body.leftArm;
        var rightArm = body.rightArm;

        var deg2rad  = Math.PI / 180;
        var a = 90 * deg2rad;

        var handFactor = p.palmWidth;

        rightArm.handPivot.x -= vars.rpx * handFactor;
        rightArm.handPivot.y += vars.rpy * handFactor;
        rightArm.handPivot.z += vars.rpz * handFactor;

        leftArm.handPivot.x  += vars.lpx * handFactor;
        leftArm.handPivot.y  += vars.lpy * handFactor;
        leftArm.handPivot.z  += vars.lpz * handFactor;

        rightArm.handTarget.x -= vars.lax * handFactor;
        rightArm.handTarget.y += vars.lay * handFactor;
        rightArm.handTarget.z += vars.laz * handFactor;

        leftArm.handTarget.x += vars.rax * handFactor;
        leftArm.handTarget.y += vars.ray * handFactor;
        leftArm.handTarget.z += vars.raz * handFactor;

        var bodyFactor = p.waistWidth / 2 + p.bodyRadius;
        body.leftTarget.x += vars.lbx * bodyFactor;
        body.leftTarget.y += vars.lby * bodyFactor;
        body.leftTarget.z += vars.lbz * bodyFactor;
        body.leftTarget.shiftFactor = 0.5 - vars.lby / 2;

        body.rightTarget.x -= vars.rbx * bodyFactor;
        body.rightTarget.y += vars.rby * bodyFactor;
        body.rightTarget.z += vars.rbz * bodyFactor;
        body.rightTarget.shiftFactor = 0.5 - vars.rby / 2;

        var headFactor = p.headRadius / 2;
        body.head.leftTarget.x += vars.lhx * headFactor;
        body.head.leftTarget.y += vars.lhy * headFactor;
        body.head.leftTarget.z += vars.lhz * headFactor;

        body.head.rightTarget.x -= vars.rhx * headFactor;
        body.head.rightTarget.y += vars.rhy * headFactor;
        body.head.rightTarget.z += vars.rhz * headFactor;

        body.cheeks.size = p.cheekRadius + vars.mcx * p.cheekRadius / 2;

        Pose.shiftY(
          body.nosePoints,
          vars.ny * p.noseCrinkleAmount,
          'crinkleFactor'
        );

        Pose.rotateXY(
          body.headPoints, body.headPivot, vars.hrx * a, vars.hry * a
        );
        body.headPoints[0].y += vars.my * p.jawAmount * Math.max(0, -vars.hry);

        var shift = vars.bx * p.bodyShiftAmount;
        var factor = 'shiftFactor';
        Pose.shiftX(body.bodyPoints, shift, factor);
        Pose.shiftX(body.headPoints, shift, factor);

        var shrug = vars.by * p.shoulderShrugAmount;
        factor = 'shrugFactor';
        Pose.shiftY(body.neck.points,         shrug, factor);
        Pose.shiftY(rightArm.shoulder.points, shrug, factor);
        Pose.shiftY(leftArm.shoulder.points,  shrug, factor);

        Pose.rotateY3(
          rightArm.index.points,
          -a - vars.ri0 * a, -vars.ri1 * a, -vars.ri2 * a,
          -vars.ris * p.fingerSpread
        );
        Pose.rotateY3(
          rightArm.middle.points,
          -a - vars.rm0 * a, -vars.rm1 * a, -vars.rm2 * a,
          -vars.rms * p.fingerSpread / 3
        );
        Pose.rotateY3(
          rightArm.ring.points,
          -a - vars.rr0 * a, -vars.rr1 * a, -vars.rr2 * a,
          vars.rrs * p.fingerSpread / 3
        );
        Pose.rotateY3(
          rightArm.pinky.points,
          -a - vars.rp0 * a,  -vars.rp1 * a, -vars.rp2 * a,
          vars.rps * p.fingerSpread
        );
        Pose.rotateThumb(
          -1,
          rightArm.thumb.points,
          -vars.rt0x * a,  vars.rt0y * a,
          -vars.rt1x * a,  vars.rt1y * a,
          -vars.rt2x * a + -vars.rt1x * a
        );

        Pose.rotateZXY(
          rightArm.handPoints,
          rightArm.handPivot,
          -vars.rrz * deg2rad,
          vars.rrx * deg2rad,
          -vars.rry * deg2rad
        );

        Pose.rotateY3(
          leftArm.index.points,
          a + vars.li0 * a, vars.li1 * a, vars.li2 * a,
          -vars.lis * p.fingerSpread
        );
        Pose.rotateY3(
          leftArm.middle.points,
          a + vars.lm0 * a, vars.lm1 * a, vars.lm2 * a,
          -vars.lms * p.fingerSpread / 3
        );
        Pose.rotateY3(
          leftArm.ring.points,
          a + vars.lr0 * a, vars.lr1 * a, vars.lr2 * a,
          vars.lrs * p.fingerSpread / 3
        );
        Pose.rotateY3(
          leftArm.pinky.points,
          a + vars.lp0 * a, vars.lp1 * a, vars.lp2 * a,
          vars.lps * p.fingerSpread
        );
        Pose.rotateThumb(
          1,
          leftArm.thumb.points,
          vars.lt0x * a, -vars.lt0y * a,
          vars.lt1x * a, -vars.lt1y * a,
          vars.lt2x * a + vars.lt1x * a
        );

        Pose.rotateZXY(
          leftArm.handPoints,
          leftArm.handPivot,
          vars.lrz * deg2rad,
          vars.lrx * deg2rad,
          vars.lry * deg2rad
        );

        var rMovePoints = [rightArm.handMove];
        var rnormalize = vars.rb + vars.rh + vars.ra;
        Pose.move(rMovePoints,   rightArm.handPivot,    {x: 0, y: 0, z: 0});
        Pose.moveBy(rMovePoints, body.rightTarget,      vars.rb / rnormalize);
        Pose.moveBy(rMovePoints, body.head.rightTarget, vars.rh / rnormalize);
        Pose.moveBy(rMovePoints, leftArm.handTarget,    vars.ra / rnormalize);


        var lMovePoints = [leftArm.handMove];
        var lnormalize = vars.lb + vars.lh + vars.la;
        Pose.move(lMovePoints,   leftArm.handPivot,     {x: 0, y: 0, z: 0});
        Pose.moveBy(lMovePoints, body.leftTarget,       vars.lb / lnormalize);
        Pose.moveBy(lMovePoints, body.head.leftTarget,  vars.lh / lnormalize);
        Pose.moveBy(lMovePoints, rightArm.handTarget,   vars.la / lnormalize);


        var zoomPivot = {x: 0, y: -p.bodyHeight};
        Pose.zoomDistort(rMovePoints,  zoomPivot, 0.002);
        Pose.zoomDistort(lMovePoints,  zoomPivot, 0.002);

        if (vars.la > vars.ra) {
          Pose.move(rightArm.handPoints, rightArm.handPivot, rightArm.handMove);
          Pose.move(leftArm.handPoints, leftArm.handPivot, leftArm.handMove);
        } else {
          Pose.move(leftArm.handPoints, leftArm.handPivot, leftArm.handMove);
          Pose.move(rightArm.handPoints, rightArm.handPivot, rightArm.handMove);
        }

        var armLength = p.lowerArmLength;
        Pose.poseElbow(-1, rightArm.armPoints, armLength);
        Pose.poseElbow(1, leftArm.armPoints, armLength);

      }
    })
  };

  window.aslfont = window.aslfont || {};
  window.aslfont.SignPuppet = SignPuppet;

}({
  each: function (obj, t) {
    var i;
    for (i in obj) {
      if (obj.hasOwnProperty(i) && t(i, obj[i]) === false) {
        return;
      }
    }
  },
  defaultTo: function (a, b) {
    if (a === undefined) {
      return b;
    }
    return a;
  },
  Constructor: function(f, p) {
    if (typeof f !== 'function') {
      p = f;
      f = function() {};
    }
    f.prototype = p;
    return f;
  }
}));