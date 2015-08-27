package YJournal::Content;

use strict;
use warnings;
use Digest::MD5 qw(md5_hex);
use DBI qw(:sql_types);
use Encode qw(encode_utf8 is_utf8);

my $sth;
my $sthFTS;

sub init {
  my $dbh = shift;

  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS content (
    id TEXT NOT NULL UNIQUE,
    content BLOB NOT NULL,
    PRIMARY KEY(id)
    );
    }) or confess ("Couldn't create content table: " . $dbh->errstr);
  $dbh->do(q{
    CREATE VIRTUAL TABLE IF NOT EXISTS contentFTS USING fts4 (
    id TEXT NOT NULL UNIQUE,
    content BLOB NOT NULL
    );
    }) or confess ("Couldn't create content FTS table: " . $dbh->errstr);

  $sth = $dbh->prepare(q{
    INSERT INTO content(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM content WHERE ID=?);
    }) or confess ("Couldn't prepare content SQL: " . $dbh->errstr);
  $sthFTS = $dbh->prepare(q{
    INSERT INTO contentFTS(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM contentFTS WHERE ID=?);
    }) or confess ("Couldn't prepare content FTS SQL: " . $dbh->errstr);
}

sub save {
  my $dbh = shift;
  my $content = shift;

  # $content might be a file handle in which the real content is saved
  if (ref($content) ne '') {
    local $/;
    binmode $content;
    $content = <$content>;
  }
  is_utf8($content)
    and $content = encode_utf8($content);
  my $cid = md5_hex($content);

  $sth->bind_param(1, $cid);
  $sth->bind_param(2, $content, SQL_BLOB);
  $sth->bind_param(3, $cid);
  $sth->execute()
    or die "Couldn't insert content: " . $dbh->errstr . "\n";

  $sthFTS->bind_param(1, $cid);
  $sthFTS->bind_param(2, $content, SQL_BLOB);
  $sthFTS->bind_param(3, $cid);
  $sthFTS->execute()
    or die "Couldn't insert content FTS: " . $dbh->errstr . "\n";

  $cid;
}

1;
