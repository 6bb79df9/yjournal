package YJournal::Item;

use strict;
use warnings;
use Data::UUID;
use DateTime;
use DateTime::Format::ISO8601;
use Digest::MD5 qw(md5_hex);

my $uuid = new Data::UUID;

sub new {
  my $class = shift;
  ref($class) and $class = ref($class);
  my $obj = {@_};
  my $default = {
    id => $uuid->create_str(),
    time => DateTime->now(),
    content => "",
  };
  while (my ($k, $v) = each (%$default)) {
    defined($obj->{$k}) or $obj->{$k} = $v;
  }
  my $self = sub {
    my $m = shift;
    @_ and $obj->{m} = shift;
    $obj->{$m};
  };
  bless $self, $class;
  return $self;
}

sub id {
  shift->('id');
}

sub time {
  shift->('time');
}

sub content {
  my $self = shift;
  $self->('content', @_);
}

my $rollback = sub {
  my $dbh = shift;
  $dbh->rollback;
  wantarray ? @_ : $_;
};

sub create {
  my $dbh = shift;
  my $self = YJournal::Item->new(@_);

  my $cid = md5_hex($self->content);
  $dbh->begin_work;
  $dbh->do(q{
    INSERT INTO content(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM content WHERE ID=?);
    }, {},
    $cid,
    $self->content,
    $cid) or return $rollback->($dbh, undef, "Couldn't insert content" . $dbh->errstr);
  $dbh->do(q{
    INSERT INTO item(id, time, cid)
    VALUES(?, ?, ?);
    }, {},
    $self->id,
    $self->time->iso8601(),
    $cid) or return $rollback->($dbh, undef, "Couldn't insert item" . $dbh->errstr);
  $dbh->commit;
  $self;
}

sub retrieve {
  my $dbh = shift;
  my $id = shift;

  $dbh->begin_work;
  my $item = $dbh->selectrow_hashref(q{
    SELECT id, time, cid
    FROM item
    WHERE id=?;
    }, {},
    $id) or return $rollback->($dbh, undef, "Couldn't load item:");
  my $content = $dbh->selectrow_hashref(q{
    SELECT content
    FROM content
    WHERE id=?;
    }, {},
    $item->{cid}) or return $rollback->($dbh, undef, "Couldn't load content" . $dbh->errstr);
  $dbh->commit;

  YJournal::Item->new(
    id => $item->{id},
    time => DateTime::Format::ISO8601->parse_datetime($item->{time}),
    content => $content->{content},
  );
}

sub update {
  my $dbh = shift;
  my $id = shift;
  my $content = shift;

  my $cid = md5_hex($content);
  $dbh->begin_work;
  $dbh->do(q{
    INSERT INTO content(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM content WHERE ID=?);
    }, {},
    $cid,
    $content,
    $cid) or return $rollback->($dbh, undef, "Couldn't insert content" . $dbh->errstr);
  $dbh->do(q{
    UPDATE item
    SET cid=?
    WHERE id=?;
    }, {},
    $cid,
    $id) or return $rollback->($dbh, undef, "Couldn't insert item" . $dbh->errstr);
  $dbh->commit;
  1;
}

sub delete {
  my $dbh = shift;
  my $id = shift;

  $dbh->begin_work;
  $dbh->do(q{
    DELETE FROM item
    WHERE id=?;
    }, {},
    $id) or $rollback->($dbh, undef, "Couldn't delete item:" . $dbh->errstr);
  $dbh->do(q{
    DELETE FROM attribute
    WHERE id=?;
    }, {},
    $id) or $rollback->($dbh, undef, "Couldn't delete attribute:" . $dbh->errstr);
  $dbh->commit;
  1;
}

1;
