<?php
// Test pentru extragerea datelor: php wp-plugin/tests/parser-test.php
// Fixtura reproduce structura reală a unui articol VideoNeat (Elementor), așa cum o întoarce site-ul.
require __DIR__ . '/../videoneat-index/includes/parser.php';

$fail = 0;
function check( $name, $cond, $got = null ) {
	global $fail;
	echo ( $cond ? "✔ " : "✘ " ) . $name . ( $cond ? '' : ' — primit: ' . var_export( $got, true ) ) . "\n";
	if ( ! $cond ) { $fail++; }
}

$html = file_get_contents( __DIR__ . '/fixture-mammal-origins.html' );
$r    = vni_extract( $html, array( 'videos.trom.tf' ) );
check( 'trailer PeerTube', $r['trailer'] === array( 'host' => 'videos.trom.tf', 'id' => '7vnFqXxTLf975m87NEaP4Q' ), $r['trailer'] );
check( 'an', $r['year'] === '2026', $r['year'] );
check( 'durată', $r['length'] === '1 part (53 minutes)', $r['length'] );
check( 'sursă', $r['source'] === 'PBS', $r['source'] );
check( 'adresa sursei', $r['source_url'] === 'https://www.pbs.org/wgbh/nova/video/mammal-origins/', $r['source_url'] );
check( 'descriere', 0 === strpos( $r['desc'], 'Uncover the surprising ancient origins of mammals' ) && false === strpos( $r['desc'], 'magnet' ), $r['desc'] );
check( 'fără YouTube', null === $r['youtube'], $r['youtube'] );

// variantă cu date Elementor (JSON escapat) și trailer pe YouTube
$json = '{"editor":"<p style=\\"text-align: center;\\"><strong>YEAR:<\\/strong> 2019 | <strong>LENGTH:<\\/strong> 3 parts (50 minutes each) | <b>SOURCE: <a href=\\"https:\\/\\/www.bbc.co.uk\\/x\\">BBC<\\/a><\\/b><\\/p>","html":"<iframe src=\\"https:\\/\\/www.youtube.com\\/embed\\/dQw4w9WgXcQ\\"><\\/iframe>"}';
$r2   = vni_extract( $json, array( 'videos.trom.tf' ) );
check( 'JSON Elementor: an', $r2['year'] === '2019', $r2['year'] );
check( 'JSON Elementor: durată', $r2['length'] === '3 parts (50 minutes each)', $r2['length'] );
check( 'JSON Elementor: sursă', $r2['source'] === 'BBC' && $r2['source_url'] === 'https://www.bbc.co.uk/x', array( $r2['source'], $r2['source_url'] ) );
check( 'YouTube detectat', $r2['youtube'] === 'dQw4w9WgXcQ', $r2['youtube'] );
check( 'fără trailer PeerTube', null === $r2['trailer'], $r2['trailer'] );

// gazdă neacceptată
$r3 = vni_extract( '<iframe src="https://evil.example/videos/embed/abcdefgh"></iframe>', array( 'videos.trom.tf' ) );
check( 'ignoră instanțe neacceptate', null === $r3['trailer'], $r3['trailer'] );

echo $fail ? "\n$fail eșecuri\n" : "\nToate testele parserului au trecut\n";
exit( $fail ? 1 : 0 );
