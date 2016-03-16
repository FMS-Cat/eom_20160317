#define MARCH_ITER 64
#define RAYAMP_LIMIT 0.05

// ------

#define PI 3.14159265
#define V vec2(0.,1.)
#define saturate(i) clamp(i,0.,1.)

// ------

precision mediump float;

uniform float time;
uniform vec2 resolution;

uniform vec3 u_cameraPos;
uniform vec3 u_cameraRot;
uniform vec3 u_ifsShift;
uniform vec3 u_ifsRotate;
uniform vec3 u_boxSize;
uniform float u_ifsOpen;

uniform sampler2D textureWord1;

// ------

struct Camera {
  vec3 pos;
  vec3 dir;
  vec3 sid;
  vec3 top;
};

struct Ray {
  vec3 dir;
  vec3 beg;
  float len;
  float lenSum;
  vec3 pos;
  vec3 col;
  float amp;
  float dist;
  bool inside;
};

// ------

vec2 p;

Camera cam;
Ray ray;

// ------

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

vec3 rotateEuler( vec3 _p, vec3 _r ) {
  vec3 p = _p;
  p.yz = rotate2D( _r.x ) * p.yz;
  p.zx = rotate2D( _r.y ) * p.zx;
  p.xy = rotate2D( _r.z ) * p.xy;
  return p;
}

// ------

float box( vec3 _pos, vec3 _size ) {
  vec3 dist = abs( _pos ) - _size;
  return min( max( dist.x, max( dist.y, dist.z ) ), 0.0 ) + length( max( dist, 0.0 ) );
}

vec3 ifs( vec3 _p, vec3 _rot, vec3 _shift ) {
  vec3 pos = _p;

  vec3 shift = _shift;

  for ( int i = 0; i < 5; i ++ ) {
    float intensity = pow( 2.0, -float( i ) );

    pos.y -= 0.0;

    pos = abs( pos ) - shift * intensity;

    shift.yz = rotate2D( _rot.x ) * shift.yz;
    shift.zx = rotate2D( _rot.y ) * shift.zx;
    shift.xy = rotate2D( _rot.z ) * shift.xy;

    if ( pos.x < pos.y ) { pos.xy = pos.yx; }
    if ( pos.x < pos.z ) { pos.xz = pos.zx; }
    if ( pos.y < pos.z ) { pos.yz = pos.zy; }
  }

  return pos;
}

float slasher( vec3 _p, float _ratio ) {
  float phase = ( _p.x + _p.y );
  float slash = abs( 0.5 - ( phase - floor( phase ) ) ) * 2.0;
  return ( slash - _ratio ) / sqrt( 3.0 );
}

// ------

float distFunc( in vec3 _p ) {
  vec3 p = _p;

  p = ifs( p, u_ifsRotate, u_ifsShift );
  float distIfs = box( p + V.yxx * u_ifsOpen, V.yyy * 0.25 );

  p = _p;

  float distBox = box( p, u_boxSize );

  float dist = max( distIfs, -distBox );

  return dist;
}

vec3 normalFunc( in vec3 _p, in float _d ) {
  vec2 d = V * _d;
  return normalize( vec3(
    distFunc( _p + d.yxx ) - distFunc( _p - d.yxx ),
    distFunc( _p + d.xyx ) - distFunc( _p - d.xyx ),
    distFunc( _p + d.xxy ) - distFunc( _p - d.xxy )
  ) );
}

// ------

Camera camInit() {
  Camera cam;
  cam.pos = u_cameraPos;

  cam.dir = rotateEuler( -V.xxy, u_cameraRot );
  cam.sid = rotateEuler( V.yxx, u_cameraRot );
  cam.top = rotateEuler( V.xyx, u_cameraRot );

  return cam;
}

Ray rayInit( in vec2 _p, in Camera _cam ) {
  ray.dir = normalize( _p.x * _cam.sid + _p.y * _cam.top + _cam.dir * ( 1.0 - length( p.xy ) * 0.3 ) );
  ray.beg = _cam.pos;
  ray.len = 1E-2;
  ray.lenSum = 0.0;
  ray.col = V.xxx;
  ray.amp = 1.0;
  ray.inside = distFunc( ray.beg ) < 0.0;
  return ray;
}

// ------

Ray march( in Ray _ray ) {
  _ray.len = 1E-2;
  for ( int iMarch = 0; iMarch < MARCH_ITER; iMarch ++ ) {
    _ray.pos = _ray.beg + _ray.dir * _ray.len;
    _ray.dist = distFunc( _ray.pos );
    _ray.dist *= ( _ray.inside ? -1.0 : 1.0 );
    _ray.len += _ray.dist;
    if ( 1E3 < _ray.len || _ray.dist < 1E-4 ) { break; }
  }
  _ray.lenSum += _ray.len;
  return _ray;
}

Ray shade( in Ray _ray ) {
  float decay = exp( -ray.len * 3E-2 );
  vec3 fogColor = V.yyy * 0.1;
  _ray.col += fogColor * ( 1.0 - decay ) * _ray.amp;
  _ray.amp *= decay;

  if ( _ray.dist < 1E-2 ) {
    vec3 normalL = normalFunc( _ray.pos, _ray.len * 1E-5 );
    vec3 normalS = normalFunc( _ray.pos, _ray.len * 1E-2 );
    float edge = saturate( length( normalL - normalS ) );

    float dif = saturate( -dot( _ray.dir, normalL ) );

    _ray.col += mix(
      V.yyy * 0.2 * dif,
      vec3( 2.3, 0.5, 0.2 ),
      edge
    ) * _ray.amp * 0.8;
    _ray.amp *= 0.2 * ( 1.0 - edge );
    _ray.beg = _ray.pos;
    _ray.dir = reflect( _ray.dir, normalL );
  } else {
    _ray.amp = 0.0;
  }
  return _ray;
}

// ------

void main() {
  p = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution.x;
  //p.x = abs( p.x );

  cam = camInit();
  ray = rayInit( p, cam );

  for ( int iRef = 0; iRef < 6; iRef ++ ) {
    ray = march( ray );
    ray = shade( ray );
    if ( ray.amp < 0.05 ) { break; }
  }

  ray.col -= length( p ) * 0.1;
  gl_FragColor = vec4( ray.col, 1.0 );
}
