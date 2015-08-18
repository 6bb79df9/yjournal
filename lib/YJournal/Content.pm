package YJournal::Content;

use strict;
use warnings;
use Digest::MD5 qw(md5_hex);

sub init {
  my $dbh = shift;

  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS content (
    id TEXT NOT NULL UNIQUE,
    content BLOB NOT NULL,
    PRIMARY KEY(id)
    );
    }) or confess ("Couldn't create content table:" . $dbh->errstr);
}

sub save {
  my $dbh = shift;
  my $content = shift;

  my $cid = md5_hex($content);
  $dbh->do(q{
    INSERT INTO content(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM content WHERE ID=?);
    }, {},
    $cid,
    $content,
    $cid) or die "Couldn't insert content" . $dbh->errstr . "\n";

  $cid;
}

1;
