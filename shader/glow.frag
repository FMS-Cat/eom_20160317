precision highp float;

#define PI 3.14159265

uniform vec2 resolution;
uniform sampler2D textureDry;
uniform sampler2D textureWet;
uniform bool isVert;

float gaussian( float _x, float _v ) {
  return 1.0 / sqrt( 2.0 * PI * _v ) * exp( - _x * _x / 2.0 / _v );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 ret = vec3( 0.0 );
  vec2 gap = vec2( 0.004, 0.0 );
  if ( isVert ) { gap = gap.yx; }

  for ( int i = -18; i <= 18; i ++ ) {
    vec2 coord = uv + gap * float( i );
    float amp = gaussian( float( i ), 9.0 );
    if ( 0.0 < coord.x && coord.x < 1.0 && 0.0 < coord.y && coord.y < 1.0 ) {
      ret += texture2D( textureWet, coord ).xyz * amp * 0.7;
    }
  }

  if ( isVert ) { ret += texture2D( textureDry, uv ).xyz; }
  gl_FragColor = vec4( ret, 1.0 );
}
