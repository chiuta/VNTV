<?php
// Test de fum pentru plugin, cu un WordPress minimal simulat: php wp-plugin/tests/plugin-smoke.php
define( 'ABSPATH', __DIR__ );
define( 'HOUR_IN_SECONDS', 3600 );
$GLOBALS['H'] = array( 'actions' => array(), 'routes' => array(), 'opt' => array(), 'meta' => array(), 'tr' => array(), 'files' => array(), 'http' => 0 );
function add_action( $h, $cb, $p = 10, $n = 1 ) { $GLOBALS['H']['actions'][ $h ][] = $cb; }
function add_filter( $h, $cb, $p = 10, $n = 1 ) { $GLOBALS['H']['actions'][ $h ][] = $cb; }
function register_activation_hook( $f, $cb ) {}
function register_deactivation_hook( $f, $cb ) {}
function get_option( $k, $d = false ) { return $GLOBALS['H']['opt'][ $k ] ?? $d; }
function update_option( $k, $v, $a = null ) { $GLOBALS['H']['opt'][ $k ] = $v; }
function wp_parse_args( $a, $d ) { return array_merge( $d, (array) $a ); }
class WP_Post { public $ID, $post_type = 'post', $post_status = 'publish', $post_content = '', $post_excerpt = '', $post_title = ''; }
$post = new WP_Post(); $post->ID = 26853; $post->post_title = 'Mammal Origins';
$post->post_content = file_get_contents( __DIR__ . '/fixture-mammal-origins.html' );
$GLOBALS['POSTS'] = array( 26853 => $post );
function get_post( $id ) { return $GLOBALS['POSTS'][ $id ] ?? null; }
function get_post_meta( $id, $k, $single = false ) { return $GLOBALS['H']['meta'][ $id ][ $k ] ?? ''; }
function update_post_meta( $id, $k, $v ) { $GLOBALS['H']['meta'][ $id ][ $k ] = $v; }
function delete_post_meta( $id, $k ) { unset( $GLOBALS['H']['meta'][ $id ][ $k ] ); }
function get_posts( $a ) { return ( $a['paged'] ?? 1 ) > 1 || ( $a['offset'] ?? 0 ) > 0 ? array() : array_keys( $GLOBALS['POSTS'] ); }
function wp_remote_get( $url, $a ) { $GLOBALS['H']['http']++; return array( 'code' => 200, 'body' => json_encode( array( 'duration' => 112, 'previewPath' => '/lazy-static/previews/x.jpg' ) ), 'url' => $url ); }
function is_wp_error( $x ) { return false; }
function wp_remote_retrieve_response_code( $r ) { return $r['code']; }
function wp_remote_retrieve_body( $r ) { return $r['body']; }
function get_the_title( $id ) { return 'Mammal Origins &#8211; NOVA'; }
function get_permalink( $id ) { return 'https://www.videoneat.com/documentaries/26853/mammal-origins/'; }
function get_the_date( $f, $id ) { return '2026-09-21'; }
function wp_get_post_categories( $id ) { return array( '128', '2' ); }
function get_the_post_thumbnail_url( $id, $s ) { return 'https://www.videoneat.com/wp-content/uploads/mammals.jpg'; }
function wp_trim_words( $t, $n, $m ) { $w = preg_split( '/\s+/', trim( $t ) ); return count( $w ) > $n ? implode( ' ', array_slice( $w, 0, $n ) ) . $m : $t; }
function wp_strip_all_tags( $t ) { return strip_tags( $t ); }
function set_transient( $k, $v, $e ) { $GLOBALS['H']['tr'][ $k ] = $v; }
function get_transient( $k ) { return $GLOBALS['H']['tr'][ $k ] ?? false; }
function delete_transient( $k ) { unset( $GLOBALS['H']['tr'][ $k ] ); }
function wp_upload_dir() { return array( 'basedir' => sys_get_temp_dir() . '/vni-test', 'error' => false ); }
function trailingslashit( $s ) { return rtrim( $s, '/' ) . '/'; }
function wp_json_encode( $d, $f = 0 ) { return json_encode( $d, $f ); }
function home_url( $p = '' ) { return 'https://www.videoneat.com/'; }
function wp_next_scheduled( $h ) { return false; }
function wp_schedule_single_event( $t, $h ) {}
function register_rest_route( $ns, $r, $a ) { $GLOBALS['H']['routes'][ $ns . $r ] = $a; }
class WP_REST_Response { public $data, $status, $headers = array(); function __construct( $d = null, $s = 200 ) { $this->data = $d; $this->status = $s; } function header( $k, $v ) { $this->headers[ $k ] = $v; } }
class WP_REST_Request implements ArrayAccess { private $p, $h; function __construct( $p = array(), $h = array() ) { $this->p = $p; $this->h = $h; }
	function get_header( $k ) { return $this->h[ $k ] ?? null; } function get_route() { return '/videoneat/v1/index'; }
	function offsetExists( $o ): bool { return isset( $this->p[ $o ] ); } function offsetGet( $o ): mixed { return $this->p[ $o ]; } function offsetSet( $o, $v ): void {} function offsetUnset( $o ): void {} }
class WP_Error { function __construct( ...$a ) {} }
@mkdir( sys_get_temp_dir() . '/vni-test' );
function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return htmlspecialchars( $t ); }
function load_plugin_textdomain( ...$a ) { return true; }
function plugin_basename( $f ) { return basename( dirname( $f ) ) . '/' . basename( $f ); }

require __DIR__ . '/../videoneat-index/videoneat-index.php';

$fail = 0;
function check( $n, $c, $g = null ) { global $fail; echo ( $c ? '✔ ' : '✘ ' ) . $n . ( $c ? '' : ' — ' . var_export( $g, true ) ) . "\n"; if ( ! $c ) { $fail++; } }

check( 'hook-uri înregistrate', isset( $H['actions']['save_post_post'], $H['actions']['rest_api_init'], $H['actions']['admin_menu'] ) );
foreach ( $H['actions']['rest_api_init'] as $cb ) { $cb(); }
check( 'rute REST', isset( $H['routes']['videoneat/v1/index'], $H['routes']['videoneat/v1/item/(?P<id>\d+)'], $H['routes']['videoneat/v1/stats'] ), array_keys( $H['routes'] ) );

$d = vni_index_post( 26853 );
check( 'indexare: trailer + durată din PeerTube', $d['trailer']['id'] === '7vnFqXxTLf975m87NEaP4Q' && $d['trailer']['dur'] === 112 && 1 === $H['http'], $d['trailer'] );
check( 'indexare: imagine de previzualizare', $d['trailer']['preview'] === 'https://videos.trom.tf/lazy-static/previews/x.jpg', $d['trailer']['preview'] ?? null );

$res = ( $H['routes']['videoneat/v1/index']['callback'] )( new WP_REST_Request() );
$it  = $res->data['items'][0] ?? array();
check( 'catalog: 1 titlu', 200 === $res->status && 1 === $res->data['count'], $res->status );
check( 'catalog: titlu decodat', 'Mammal Origins – NOVA' === $it['title'], $it['title'] ?? null );
check( 'catalog: categorii numerice', array( 128, 2 ) === $it['cats'], $it['cats'] ?? null );
check( 'catalog: an / durată / sursă', '2026' === $it['year'] && '1 part (53 minutes)' === $it['length'] && 'PBS' === $it['source'], $it );
check( 'catalog: rezumat din descriere', 0 === strpos( $it['excerpt'], 'Uncover the surprising' ), $it['excerpt'] ?? null );
check( 'catalog: ETag și cache', isset( $res->headers['ETag'] ) && false !== strpos( $res->headers['Cache-Control'], 'max-age' ) );
$res304 = ( $H['routes']['videoneat/v1/index']['callback'] )( new WP_REST_Request( array(), array( 'if_none_match' => $res->headers['ETag'] ) ) );
check( 'catalog: 304 la ETag identic', 304 === $res304->status, $res304->status );
check( 'fișier static scris', is_file( sys_get_temp_dir() . '/vni-test/videoneat-index.json' ) );
$item = ( $H['routes']['videoneat/v1/item/(?P<id>\d+)']['callback'] )( new WP_REST_Request( array( 'id' => 26853 ) ) );
check( 'item: descriere completă', 0 === strpos( $item->data['desc'], 'Uncover the surprising' ), $item->data['desc'] ?? null );

// CORS deschis doar pe rutele pluginului
$f = end( $H['actions']['rest_post_dispatch'] );
$r = $f( new WP_REST_Response( array() ), null, new WP_REST_Request() );
check( 'CORS deschis', '*' === ( $r->headers['Access-Control-Allow-Origin'] ?? null ) );

// reindexarea pe loturi: un lot mic se termină și marchează finalul
update_option( 'vni_progress', array( 'offset' => 0, 'done' => 0, 'running' => 1 ) );
foreach ( $H['actions']['vni_rebuild_batch'] as $cb ) { $cb(); }
$pr = get_option( 'vni_progress' );
check( 'reindexare pe loturi: încheiată', 0 === $pr['running'] && 1 === $pr['done'], $pr );
check( 'lot mic, cu buget de timp', VNI_BATCH <= 10 && VNI_BUDGET <= 25 );
check( 'textdomain încărcat la init', isset( $H['actions']['init'] ) );

echo $fail ? "\n$fail eșecuri\n" : "\nTestul de fum al pluginului a trecut\n";
exit( $fail ? 1 : 0 );
