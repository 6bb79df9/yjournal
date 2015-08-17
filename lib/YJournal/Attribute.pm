package YJournal::Attribute;

use strict;
use warnings;
use Digest::MD5 qw(md5_hex);
use YJournal::Content;

sub create {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;
  my $content = shift;
  my $ctype = shift || "application/json";
  $dbh->begin_work;
  my ($cid, $error) = YJournal::Content::save($dbh, $content);
  defined($cid) or return (undef, $error);
  $dbh->do(q{
    INSERT INTO attribute(id, type, name, ctype, cid)
    VALUES(?, ?, ?, ?, ?);
    }, {},
    $id,
    $type,
    $name,
    $ctype,
    $cid) or return YJournal::DB::rollback($dbh, undef, "Couldn't insert attribute" . $dbh->errstr);
  $dbh->commit;
  return {
    id => $id,
    type => $type,
    name => $name,
    content => $content,
    ctype => $ctype,
  };
}

sub retrieve {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;
  $dbh->begin_work;
  my $attribute = $dbh->selectrow_hashref(q{
    SELECT ctype, cid
    FROM attribute
    WHERE id=? AND type=? AND name=?;
    }, {},
    $id,
    $type,
    $name) or return YJournal::DB::rollback($dbh, undef, "Couldn't load attribute:");
  my $content = $dbh->selectrow_hashref(q{
    SELECT content
    FROM content
    WHERE id=?;
    }, {},
    $attribute->{cid}) or return YJournal::DB::rollback($dbh, undef, "Couldn't load content" . $dbh->errstr);
  $dbh->commit;
  return {
    id => $id,
    type => $type,
    name => $name,
    ctype => $attribute->{ctype},
    content => $content->{content},
  };
}

sub update {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;
  my $content = shift;

  $dbh->begin_work;
  my ($cid, $error) = YJournal::Content::save($dbh, $content);
  defined($cid) or return (undef, $error);
  $dbh->do(q{
    UPDATE attribute
    SET cid=?
    WHERE id=? AND type=? AND name=?;
    }, {},
    $cid,
    $id,
    $type,
    $name) or return YJournal::DB::rollback($dbh, undef, "Couldn't update attribute" . $dbh->errstr);
  $dbh->commit;
  1;
}

sub delete {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;
  my $name = shift;

  $dbh->begin_work;
  $dbh->do(q{
    DELETE FROM attribute
    WHERE id=? AND type=? AND name=?;
    }, {},
    $id,
    $type,
    $name) or YJournal::DB::rollback($dbh, undef, "Couldn't delete attribute" . $dbh->errstr);
  $dbh->commit;
  1;
}

sub query {
  my $dbh = shift;
  my $id = shift;
  my $type = shift;

  $dbh->begin_work;
  my $rows = $dbh->selectall_arrayref(q{
    SELECT
      attribute.id AS id,
      attribute.type AS type,
      attribute.name AS name,
      attribute.ctype AS ctype,
      content.content AS content
    FROM attribute
    LEFT JOIN content ON attribute.cid=content.id
    WHERE attribute.id=? AND attribute.type=?;
    },
    {Slice => {}},
    $id,
    $type) or YJournal::DB::rollback($dbh, undef, "Couldn't load attribute list:" . $dbh->errstr);
  $dbh->commit;
  return $rows;
}

1;
