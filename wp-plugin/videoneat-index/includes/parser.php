<?php
/**
 * VideoNeat Index — data extraction from a VideoNeat post.
 * No WordPress dependencies, so it can be tested on its own (wp-plugin/tests/parser-test.php).
 */
if ( ! defined( 'VNI_PARSER' ) ) {
	define( 'VNI_PARSER', 1 );
}

/**
 * @param string   $html  Post content (Elementor-rendered HTML, post_content or decoded Elementor data).
 * @param string[] $hosts Accepted PeerTube instances for trailers (e.g. ['videos.trom.tf']).
 * @return array{trailer:?array,youtube:?string,year:?string,length:?string,source:?string,source_url:?string,desc:string}
 */
function vni_extract( $html, array $hosts ) {
	$html = (string) $html;
	// Elementor data (JSON) contains HTML with escaped quotes and slashes
	$html = str_replace( array( '\\/', '\\"', '\\n', '\\t' ), array( '/', '"', "\n", ' ' ), $html );
	$out  = array(
		'trailer'    => null,
		'youtube'    => null,
		'year'       => null,
		'length'     => null,
		'source'     => null,
		'source_url' => null,
		'desc'       => '',
	);

	// 1. the PeerTube trailer (embedded player or /w/ link)
	if ( preg_match_all( '~https?://([a-z0-9.-]+)/(?:videos/embed|videos/watch|w)/([A-Za-z0-9-]{6,})~i', $html, $m, PREG_SET_ORDER ) ) {
		foreach ( $m as $x ) {
			if ( in_array( strtolower( $x[1] ), $hosts, true ) ) {
				$out['trailer'] = array( 'host' => strtolower( $x[1] ), 'id' => $x[2] );
				break;
			}
		}
	}
	// YouTube trailer (statistics only: not played)
	if ( preg_match( '~(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{11})~', $html, $y ) ) {
		$out['youtube'] = $y[1];
	}

	// 2. the "YEAR: … | LENGTH: … | SOURCE: …" line
	$text = vni_text( $html );
	if ( preg_match( '~YEAR:\s*(\d{4})~i', $text, $x ) ) {
		$out['year'] = $x[1];
	}
	if ( preg_match( '~LENGTH:\s*([^|\n]+)~i', $text, $x ) ) {
		$out['length'] = trim( preg_replace( '~\s+~u', ' ', $x[1] ) );
	}
	if ( preg_match( '~SOURCE:\s*(?:<[^>]+>\s*)*<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>~is', $html, $x ) ) {
		$url = html_entity_decode( $x[1], ENT_QUOTES, 'UTF-8' );
		if ( preg_match( '~^https?://~i', $url ) ) {
			$out['source_url'] = $url;
		}
		$out['source'] = trim( html_entity_decode( strip_tags( $x[2] ), ENT_QUOTES, 'UTF-8' ) ) ?: null;
	} elseif ( preg_match( '~SOURCE:\s*([^|\n]+)~i', $text, $x ) ) {
		$out['source'] = trim( $x[1] ) ?: null;
	}

	// 3. the description: text after the "description:" heading
	$pos = stripos( $text, 'description:' );
	if ( false !== $pos ) {
		$desc = trim( substr( $text, $pos + strlen( 'description:' ) ) );
		$desc = preg_split( '~\n\s*(SIMILAR TITLES|You may also like)~i', $desc )[0];
		$out['desc'] = trim( preg_replace( "~\n{3,}~", "\n\n", $desc ) );
	}
	return $out;
}

/** Plain text from HTML, keeping paragraphs. */
function vni_text( $html ) {
	$html = preg_replace( '~<(script|style)\b[^>]*>.*?</\1>~is', '', $html );
	$html = preg_replace( '~<br\s*/?>~i', "\n", $html );
	$html = preg_replace( '~</(p|div|h[1-6]|li|section)>~i', "\n", $html );
	$text = html_entity_decode( strip_tags( $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = str_replace( "\xC2\xA0", ' ', $text );
	$text = preg_replace( "~[ \t]+~u", ' ', $text );
	$text = preg_replace( "~ *\n *~", "\n", $text );
	return trim( preg_replace( "~\n{3,}~", "\n\n", $text ) );
}
