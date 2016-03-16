( function() {

  'use strict';

  let requestText = function( _url, _callback ){
    let xhr = new XMLHttpRequest();
    xhr.open( 'GET', _url, true );
    xhr.responseType = 'text';
    xhr.onload = function( _e ){
      if( typeof _callback === 'function' ){
        _callback( this.response );
      }
    };
    xhr.send();
  };

  let step = function( _array ){
    let array = _array;
    let count = 0;

    let func = function(){
      if( typeof _array[ count ] === 'function' ){
        _array[ count ]( func );
      }
      count ++;
    };
    func();
  };

  // ------

  let seed;
  let xorshift = function( _seed ) {
    seed = _seed || seed || 1;
    seed = seed ^ ( seed << 13 );
    seed = seed ^ ( seed >>> 17 );
    seed = seed ^ ( seed << 5 );
    return seed / Math.pow( 2, 32 ) + 0.5;
  };

  // ------

  let clamp = function( _value, _min, _max ) {
    return Math.min( Math.max( _value, _min ), _max );
  }

  let saturate = function( _value ) {
    return clamp( _value, 0.0, 1.0 );
  }

  let merge = function( _a, _b ) {
    let ret = {};
    for ( let key in _a ) {
      ret[ key ] = _a[ key ];
    }
    for ( let key in _b ) {
      ret[ key ] = _b[ key ];
    }
    return ret;
  }

  // ------

  let gl = canvas.getContext( 'webgl' );
  let glCat = new GLCat( gl );

  let programs = {};
  let quadVBO = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );
  let quadVert = 'attribute vec2 p; void main() { gl_Position = vec4( p, 0.0, 1.0 ); }';

  let framebuffers = {};
  framebuffers.render = glCat.createFloatFramebuffer( canvas.width, canvas.height );
  framebuffers.glow = glCat.createFloatFramebuffer( canvas.width, canvas.height );
  framebuffers.blur = glCat.createFloatFramebuffer( canvas.width, canvas.height );
  framebuffers.return = glCat.createFloatFramebuffer( canvas.width, canvas.height );

  let renderA = document.createElement( 'a' );

  // ------

  let movementInit = {
    mode: Movement.SPRING,
    springConstant: 300.0,
    springRatio: 1.0,
    frameRate: 50.0
  };
  let movementInitCamera = merge(
    movementInit,
    { springConstant: 300.0 }
  );
  let movements = {};

  movements.cameraPosX = new Movement( movementInitCamera );
  movements.cameraPosY = new Movement( movementInitCamera );
  movements.cameraPosZ = new Movement( movementInitCamera );
  movements.cameraRotX = new Movement( movementInitCamera );
  movements.cameraRotY = new Movement( movementInitCamera );
  movements.cameraRotZ = new Movement( movementInitCamera );
  movements.boxSizeX = new Movement( movementInit );
  movements.boxSizeY = new Movement( movementInit );
  movements.boxSizeZ = new Movement( movementInit );
  movements.ifsOpen = new Movement( movementInit );
  movements.ifsShiftX = new Movement( movementInit );
  movements.ifsShiftY = new Movement( movementInit );
  movements.ifsShiftZ = new Movement( movementInit );
  movements.ifsRotateX = new Movement( movementInit );
  movements.ifsRotateY = new Movement( movementInit );
  movements.ifsRotateZ = new Movement( movementInit );
  window.movements = movements;

  // ------

  let time = 0;
  let frame = 0;
  let blurCount = 0;

  let timeline = {
    0.00: function() {
      movements.cameraPosX.set( { target: 0.0 } );
      movements.cameraPosY.set( { target: 0.0 } );
      movements.cameraPosZ.set( { target: 0.0 } );

      movements.cameraRotX.set( { target: 0.0 } );
      movements.cameraRotY.set( { target: 0.0 } );
      movements.cameraRotZ.set( { target: 0.0 } );

      movements.ifsShiftX.set( { target: 3.8 } );
      movements.ifsShiftY.set( { target: 3.5 } );
      movements.ifsShiftZ.set( { target: 4.4 } );

      movements.ifsRotateX.set( { target: 0.1 } );
      movements.ifsRotateY.set( { target: 0.1 } );
      movements.ifsRotateZ.set( { target: 0.1 } );

      movements.boxSizeX.set( { target: 5.0 } );
      movements.boxSizeY.set( { target: 1.0 } );
      movements.boxSizeZ.set( { target: 5.0 } );

      movements.ifsOpen.set( { target: 0.1 } );
    },
    0.125: function() {
      movements.cameraRotX.set( { target: 0.0 } );
      movements.cameraRotY.set( { target: Math.PI / 2.0, position: movements.cameraRotY.position + Math.PI } );
      movements.cameraRotZ.set( { target: 0.0 } );

      movements.ifsShiftX.set( { target: 4.5 } );
      movements.ifsShiftY.set( { target: 3.1 } );
      movements.ifsShiftZ.set( { target: 3.8 } );

      movements.ifsRotateX.set( { target: 0.0 } );
      movements.ifsRotateY.set( { target: 0.0 } );
      movements.ifsRotateZ.set( { target: 0.0 } );

      movements.boxSizeX.set( { target: 7.0 } );
      movements.boxSizeY.set( { target: 2.0 } );
      movements.boxSizeZ.set( { target: 2.0 } );

      movements.ifsOpen.set( { target: 0.0 } );
    },
    0.25: function() {
      movements.cameraRotX.set( { target: Math.PI / 2.0 } );
      movements.cameraRotY.set( { target: Math.PI / 2.0 } );
      movements.cameraRotZ.set( { target: 0.0 } );

      movements.ifsShiftX.set( { target: 3.9 } );
      movements.ifsShiftY.set( { target: 3.5 } );
      movements.ifsShiftZ.set( { target: 4.4 } );

      movements.ifsRotateX.set( { target: 0.0 } );
      movements.ifsRotateY.set( { target: 0.0 } );
      movements.ifsRotateZ.set( { target: 0.0 } );

      movements.boxSizeX.set( { target: 1.0 } );
      movements.boxSizeY.set( { target: 1.0 } );
      movements.boxSizeZ.set( { target: 1.0 } );

      movements.ifsOpen.set( { target: 0.2 } );
    },
    0.375: function() {
      movements.cameraRotX.set( { target: Math.PI / 2.0 } );
      movements.cameraRotY.set( { target: 0.0 } );
      movements.cameraRotZ.set( { target: 0.0 } );

      movements.ifsShiftX.set( { target: 1.4 } );
      movements.ifsShiftY.set( { target: 1.4 } );
      movements.ifsShiftZ.set( { target: 1.4 } );

      movements.ifsRotateX.set( { target: 0.0 } );
      movements.ifsRotateY.set( { target: 0.0 } );
      movements.ifsRotateZ.set( { target: 0.1 } );

      movements.boxSizeX.set( { target: 2.0 } );
      movements.boxSizeY.set( { target: 2.0 } );
      movements.boxSizeZ.set( { target: 0.5 } );

      movements.ifsOpen.set( { target: 0.1 } );
    },
    0.50: function() {
      movements.cameraRotX.set( { target: Math.PI / 2.0 } );
      movements.cameraRotY.set( { target: 0.0 } );
      movements.cameraRotZ.set( { target: -Math.PI / 2.0 } );

      movements.ifsShiftX.set( { target: 1.9 } );
      movements.ifsShiftY.set( { target: 4.0 } );
      movements.ifsShiftZ.set( { target: 3.8 } );

      movements.ifsRotateX.set( { target: 0.24 } );
      movements.ifsRotateY.set( { target: 0.22 } );
      movements.ifsRotateZ.set( { target: 0.2 } );

      movements.boxSizeX.set( { target: 3.0 } );
      movements.boxSizeY.set( { target: 3.0 } );
      movements.boxSizeZ.set( { target: 3.0 } );

      movements.ifsOpen.set( { target: 0.15 } );
    },
    0.625: function() {
      movements.cameraRotX.set( { target: Math.PI / 2.0 } );
      movements.cameraRotY.set( { target: Math.PI / 2.0 } );
      movements.cameraRotZ.set( { target: -Math.PI / 2.0 } );

      movements.ifsShiftX.set( { target: 3.1 } );
      movements.ifsShiftY.set( { target: 2.8 } );
      movements.ifsShiftZ.set( { target: 2.7 } );

      movements.ifsRotateX.set( { target: 0.13 } );
      movements.ifsRotateY.set( { target: 0.18 } );
      movements.ifsRotateZ.set( { target: 0.2 } );

      movements.boxSizeX.set( { target: 3.0 } );
      movements.boxSizeY.set( { target: 5.0 } );
      movements.boxSizeZ.set( { target: 5.0 } );

      movements.ifsOpen.set( { target: 0.0 } );
    },
    0.75: function() {
      movements.cameraRotX.set( { target: 0.0 } );
      movements.cameraRotY.set( { target: Math.PI / 2.0 } );
      movements.cameraRotZ.set( { target: -Math.PI / 2.0 } );

      movements.ifsShiftX.set( { target: 2.0 } );
      movements.ifsShiftY.set( { target: 3.0 } );
      movements.ifsShiftZ.set( { target: 3.7 } );

      movements.ifsRotateX.set( { target: 0.11 } );
      movements.ifsRotateY.set( { target: 0.17 } );
      movements.ifsRotateZ.set( { target: 0.13 } );

      movements.boxSizeX.set( { target: 2.0 } );
      movements.boxSizeY.set( { target: 2.0 } );
      movements.boxSizeZ.set( { target: 0.8 } );

      movements.ifsOpen.set( { target: 0.2 } );
    },
    0.875: function() {
      movements.cameraRotX.set( { target: 0.0 } );
      movements.cameraRotY.set( { target: Math.PI / 2.0 } );
      movements.cameraRotZ.set( { target: 0.0 } );

      movements.ifsShiftX.set( { target: 3.0 } );
      movements.ifsShiftY.set( { target: 3.0 } );
      movements.ifsShiftZ.set( { target: 3.0 } );

      movements.ifsRotateX.set( { target: 0.0 } );
      movements.ifsRotateY.set( { target: 0.0 } );
      movements.ifsRotateZ.set( { target: 0.0 } );

      movements.boxSizeX.set( { target: 3.0 } );
      movements.boxSizeY.set( { target: 3.0 } );
      movements.boxSizeZ.set( { target: 3.0 } );

      movements.ifsOpen.set( { target: 0.0 } );
    },
  };

  let timelineProgress = -1.0;
  let executeTimeline = function() {
    for ( let keyTime in timeline ) {
      if ( keyTime < time ) {
        if ( timelineProgress < keyTime ) {
          timelineProgress = keyTime;
          timeline[ keyTime ]();
          break;
        }
      } else {
        break;
      }
    }
  }

  let movement = function() {

    executeTimeline();

    for ( let key in movements ) {
      movements[ key ].frameRate = 50.0 * ( blurCheckbox.checked ? 10.0 : 1.0 );
      movements[ key ].update();
    }

  }

  // ------

  let raymarch = function() {

    gl.viewport( 0, 0, canvas.width, canvas.height );
    glCat.useProgram( programs.raymarch );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffers.render );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );
    glCat.uniform1f( 'time', time );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );
    glCat.uniform3fv( 'u_cameraPos', [
      movements.cameraPosX.position,
      movements.cameraPosY.position,
      movements.cameraPosZ.position
    ] );
    glCat.uniform3fv( 'u_cameraRot', [
      movements.cameraRotX.position,
      movements.cameraRotY.position,
      movements.cameraRotZ.position
    ] );
    glCat.uniform3fv( 'u_ifsShift', [
      movements.ifsShiftX.position,
      movements.ifsShiftY.position,
      movements.ifsShiftZ.position
    ] );
    glCat.uniform3fv( 'u_ifsRotate', [
      movements.ifsRotateX.position,
      movements.ifsRotateY.position,
      movements.ifsRotateZ.position
    ] );
    glCat.uniform3fv( 'u_boxSize', [
      movements.boxSizeX.position,
      movements.boxSizeY.position,
      movements.boxSizeZ.position
    ] );
    glCat.uniform1f( 'u_ifsOpen', movements.ifsOpen.position );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  };

  let glow = function() {

    gl.viewport( 0, 0, canvas.width, canvas.height );
    glCat.useProgram( programs.glow );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffers.return );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );
    glCat.uniform1i( 'isVert', 0 );
    glCat.uniformTexture( 'textureDry', framebuffers.render.texture, 0 );
    glCat.uniformTexture( 'textureWet', framebuffers.render.texture, 1 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    // ------

    gl.viewport( 0, 0, canvas.width, canvas.height );
    glCat.useProgram( programs.glow );
    gl.bindFramebuffer( gl.FRAMEBUFFER, blurCheckbox.checked ? framebuffers.glow : null );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );
    glCat.uniform1i( 'isVert', 1 );
    glCat.uniformTexture( 'textureDry', framebuffers.render.texture, 0 );
    glCat.uniformTexture( 'textureWet', framebuffers.return.texture, 1 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  };

  let blur = function() {

    gl.viewport( 0, 0, canvas.width, canvas.height );
    glCat.useProgram( programs.blur );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffers.return );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );
    glCat.uniform1f( 'add', 0.1 );
    glCat.uniform1i( 'init', blurCount === 0 );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );
    glCat.uniformTexture( 'renderTexture', framebuffers.glow.texture, 0 );
    glCat.uniformTexture( 'blurTexture', framebuffers.blur.texture, 1 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    // ------

    gl.viewport( 0, 0, canvas.width, canvas.height );
    glCat.useProgram( programs.return );
    gl.bindFramebuffer( gl.FRAMEBUFFER, blurCount === 9 ? null : framebuffers.blur );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );
    glCat.uniformTexture( 'texture', framebuffers.return.texture, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  }

  let render = function() {
    if ( blurCheckbox.checked ) {
      for ( let iBlur = 0; iBlur < 10; iBlur ++ ) {
        blurCount = iBlur;
        movement();
        raymarch();
        glow();
        blur();
      }
    } else {
      movement();
      raymarch();
      glow();
    }
    gl.flush();
  }

  let saveFrame = function() {
    renderA.href = canvas.toDataURL();
    renderA.download = ( '0000' + frame ).slice( -5 ) + '.png';
    renderA.click();
  };

  let update = function() {

    let frames = 160;
    if ( ( frame % frames ) === 0 ) {
      timelineProgress = -1.0;
    }
    time = ( frame % frames ) / frames;

    render();

    if ( saveCheckbox.checked && frames <= frame ) {
      saveFrame();
    }

    frame ++;
    requestAnimationFrame( update );

  };

  goButton.onclick = function() {
    update();
  };

  // ------

  step( {

    0: function( _step ) {
      requestText( 'shader/raymarch.frag', function( _frag ) {
        programs.raymarch = glCat.createProgram( quadVert, _frag );
        _step();
      } );
      requestText( 'shader/glow.frag', function( _frag ) {
        programs.glow = glCat.createProgram( quadVert, _frag );
        _step();
      } );
      requestText( 'shader/blur.frag', function( _frag ) {
        programs.blur = glCat.createProgram( quadVert, _frag );
        _step();
      } );
      requestText( 'shader/return.frag', function( _frag ) {
        programs.return = glCat.createProgram( quadVert, _frag );
        _step();
      } );
    },

    4: function( _step ) {
      goButton.style.display = 'inline';
    }

  } );



} )();
