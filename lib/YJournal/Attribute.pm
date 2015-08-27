package YJournal::Attribute;

use strict;
use warnings;
use Digest::MD5 qw(md5_hex);
use YJournal::Content;
use Encode qw(is_utf8 encode_utf8);

sub init {
  my $dbh = shift;

  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS attribute (
    id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    ctype TEXT NOT NULL,
    cid TEXT NOT NULL,
    PRIMARY KEY(id, type, name)
    );
    }) or die "Couldn't create attribute table" . $dbh->errstr . "\n";
}

sub create {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;
  my $content = shift;
  my $ctype = shift || "";

  my $cid = YJournal::Content::save($dbh, $content);
  $dbh->do(q{
    INSERT INTO attribute(id, type, name, ctype, cid)
    VALUES(?, ?, ?, ?, ?);
    }, {},
    $id,
    $type,
    $name,
    $ctype,
    $cid) or return die "Couldn't insert attribute: " . $dbh->errstr . "\n";

  {
    id => $id,
    type => $type,
    name => $name,
    content => (ref($content) ne "" ? $name : $content),
    ctype => $ctype,
  };
}

sub retrieve {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;

  my $ret = $dbh->selectrow_hashref(q{
    SELECT ctype, CASE WHEN ctype<>'' THEN name ELSE content.content END AS content
    FROM attribute
    LEFT JOIN content
    ON attribute.cid=content.id
    WHERE attribute.id=? AND type=? AND name=?;
    }, {},
    $id,
    $type,
    $name) or die "Couldn't load attribute: " . $dbh->errstr . "\n";
  is_utf8($ret->{content})
    or $ret->{content} = decode_utf8($ret->{content});
  return {
    id => $id,
    type => $type,
    name => $name,
    ctype => $ret->{ctype},
    content => $ret->{content},
  };
}

sub download {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;

  my $ret = $dbh->selectrow_hashref(q{
    SELECT ctype, content.content AS content
    FROM attribute
    LEFT JOIN content
    ON attribute.cid=content.id
    WHERE attribute.id=? AND type=? AND name=?;
    }, {},
    $id,
    $type,
    $name) or die "Couldn't load attribute: " . $dbh->errstr . "\n";
  return {
    id => $id,
    type => $type,
    name => $name,
    ctype => $ret->{ctype},
    content => $ret->{content},
  };
}

sub update {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;
  my $content = shift;
  my $ctype = shift || "";

  my $cid = YJournal::Content::save($dbh, $content);
  if (defined($ctype)) {
    $dbh->do(q{
      UPDATE attribute
      SET cid=?, ctype=?
      WHERE id=? AND type=? AND name=?;
      }, {},
      $cid,
      $ctype,
      $id,
      $type,
      $name) or die "Couldn't update attribute: " . $dbh->errstr . "\n";
  } else {
    $dbh->do(q{
      UPDATE attribute
      SET cid=?
      WHERE id=? AND type=? AND name=?;
      }, {},
      $cid,
      $id,
      $type,
      $name) or die "Couldn't update attribute: " . $dbh->errstr . "\n";
  }
  1;
}

sub delete {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;

  $dbh->do(q{
    DELETE FROM attribute
    WHERE id=? AND type=? AND name=?;
    }, {},
    $id,
    $type,
    $name) or die "Couldn't delete attribute: " . $dbh->errstr . "\n";
  1;
}

sub query {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;

  my $rows = $dbh->selectall_arrayref(q{
    SELECT
    attribute.id AS id,
    attribute.type AS type,
    attribute.name AS name,
    attribute.ctype AS ctype,
    CASE WHEN attribute.ctype<>'' THEN name ELSE content.content END AS content
    FROM attribute
    LEFT JOIN content ON attribute.cid=content.id
    WHERE attribute.id=? AND attribute.type=?;
    },
    {Slice => {}},
    $id,
    $type) or die "Couldn't load attribute list: " . $dbh->errstr . "\n";
  [map {
    is_utf8($_->{content})
      or $_->{content} = decode_utf8($_->{content});
    $_;
  } @$rows];
}

1;
