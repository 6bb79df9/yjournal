package YJournal::Item;

use strict;
use warnings;
use Data::UUID;
use DateTime;
use DateTime::Format::ISO8601;
use YJournal::Attribute;
use YJournal::Content;

my $uuid = new Data::UUID;

sub new {
  my $class = shift;
  ref($class) and $class = ref($class);
  my $obj = {@_};
  defined($obj->{time}) && ref($obj->{time}) eq ''
    and $obj->{time} = DateTime::Format::ISO8601->parse_datetime($obj->{time});
  my $default = {
    id => $uuid->create_str(),
    time => DateTime->now(),
    content => "",
    attribute => {},
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

sub attribute {
  my $self = shift;
  my $attrs = $self->('attribute');
  for (@_) {
    $attrs->{$_->{type}}->{$_->{name}} = $_;
  }
  $self->('attribute', $attrs);
  $attrs;
}

sub create {
  my $dbh = shift;
  my $self = YJournal::Item->new(@_);

  $dbh->begin_work;
  my ($cid, $error) = YJournal::Content::save($dbh, $self->content);
  defined($cid) or return (undef, $error);
  $dbh->do(q{
    INSERT INTO item(id, time, cid)
    VALUES(?, ?, ?);
    }, {},
    $self->id,
    $self->time->iso8601(),
    $cid) or return YJournal::DB::rollback($dbh, undef, "Couldn't insert item" . $dbh->errstr);
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
    $id) or return YJournal::DB::rollback($dbh, undef, "Couldn't load item:");
  my $content = $dbh->selectrow_hashref(q{
    SELECT content
    FROM content
    WHERE id=?;
    }, {},
    $item->{cid}) or return YJournal::DB::rollback($dbh, undef, "Couldn't load content" . $dbh->errstr);
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

  $dbh->begin_work;
  my ($cid, $error) = YJournal::Content::save($dbh, $content);
  defined($cid) or return (undef, $error);
  $dbh->do(q{
    UPDATE item
    SET cid=?
    WHERE id=?;
    }, {},
    $cid,
    $id) or return YJournal::DB::rollback($dbh, undef, "Couldn't update item" . $dbh->errstr);
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
    $id) or YJournal::DB::rollback($dbh, undef, "Couldn't delete item:" . $dbh->errstr);
  $dbh->do(q{
    DELETE FROM attribute
    WHERE id=?;
    }, {},
    $id) or YJournal::DB::rollback($dbh, undef, "Couldn't delete attribute:" . $dbh->errstr);
  $dbh->commit;
  1;
}

sub query {
  my $dbh = shift;
  my $interestedAttrTypes = shift || [];
  $dbh->begin_work;
  my $rows = $dbh->selectall_arrayref(q{
    SELECT item.id AS id, item.time as time, content.content AS content
    FROM item
    LEFT JOIN content ON item.cid=content.id;
    },
    {Slice => {}}) or YJournal::DB::rollback($dbh, undef, "Couldn't load item list:" . $dbh->errstr);
  $dbh->commit;
  my $items = [map {YJournal::Item->new(%$_);} @$rows];
  for my $type (@$interestedAttrTypes) {
    for my $item (@$items) {
      my ($attrs, $error) = YJournal::Attribute::query($dbh, $item->id, $type);
      defined($attrs) or return ($attrs, $error);
      $item->attribute(@$attrs);
    }
  }
  return $items;
}

sub TO_JSON {
  my $self = shift;
  return {
    id => $self->id(),
    time => $self->time()->iso8601(),
    content => $self->content(),
    attribute => $self->attribute(),
  };
}

1;
