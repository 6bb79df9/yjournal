package YJournal::Item;

use strict;
use warnings;
use Data::UUID;
use DateTime;
use DateTime::Format::ISO8601;
use YJournal::Attribute;
use YJournal::Content;
use Encode qw(decode_utf8 is_utf8);

my $uuid = new Data::UUID;

sub init {
  my $dbh = shift;
  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS item (
    id TEXT NOT NULL UNIQUE,
    time TEXT NOT NULL,
    cid TEXT NOT NULL,
    PRIMARY KEY(id)
    );
    }) or die "Couldn't create item table:" . $dbh->errstr . "\n";
}

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
    @_ and $obj->{$m} = shift;
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
  my $type = shift;
  my $attrs = $self->('attribute');
  defined($type) && !defined($attrs->{$type}) and $attrs->{$type} = {};
  for (@_) {
    $attrs->{$_->{type}}->{$_->{name}} = $_;
  }
  $self->('attribute', $attrs);
  $attrs;
}

sub create {
  my $dbh = shift;
  my $self = YJournal::Item->new(@_);

  my $cid = YJournal::Content::save($dbh, $self->content);
  $dbh->do(q{
    INSERT INTO item(id, time, cid)
    VALUES(?, ?, ?);
    }, {},
    $self->id,
    $self->time->iso8601(),
    $cid) or die "Couldn't insert item: " . $dbh->errstr . "\n";
  my $attribute = $self->attribute;
  while (my ($type, $xs) = each(%$attribute)) {
    while (my ($name, $content) = each(%$xs)) {
      $self->attribute($type,
        YJournal::Attribute::create($dbh, $self->id, $type, $name, $content));
    }
  }
  $self;
}

sub retrieve {
  my $dbh = shift;
  my $id = shift;
  my $interestedAttrTypes = shift || [];

  my $row = $dbh->selectrow_hashref(q{
    SELECT item.id AS id, time, content.content
    FROM item
    LEFT JOIN content
    ON item.cid=content.id
    WHERE item.id=?;
    }, {},
    $id) or die "Item not exists: $id\n";
  is_utf8($row->{content})
    or $row->{content} = decode_utf8($row->{content});
  my $item = YJournal::Item->new(
    %$row
  );
  for my $type (@$interestedAttrTypes) {
    $item->attribute($type,
      @{YJournal::Attribute::query($dbh, $item->id, $type)});
  }

  $item;
}

sub update {
  my $dbh = shift;
  my $id = shift;
  my $content = shift;

  my $cid = YJournal::Content::save($dbh, $content);
  $dbh->do(q{
    UPDATE item
    SET cid=?
    WHERE id=?;
    }, {},
    $cid,
    $id) or die "Couldn't update item: " . $dbh->errstr . "\n";
  1;
}

sub delete {
  my $dbh = shift;
  my $id = shift;

  $dbh->do(q{
    DELETE FROM item
    WHERE id=?;
    }, {},
    $id) or die "Couldn't delete item: " . $dbh->errstr . "\n";
  $dbh->do(q{
    DELETE FROM attribute
    WHERE id=?;
    }, {},
    $id) or die "Couldn't delete attribute: " . $dbh->errstr . "\n";
  1;
}

sub query {
  my $dbh = shift;
  my $queryParams = {@_};
  my $interestedAttrTypes = $queryParams->{attrTypes} || [];
  my $ftsQuery = $queryParams->{query};

  my $rows;
  if (defined($ftsQuery)) {
    $rows = $dbh->selectall_arrayref(q{
      SELECT item.id AS id, item.time as time, contentFTS.content AS content
      FROM item
      INNER JOIN contentFTS
      ON item.cid=contentFTS.id AND contentFTS.content MATCH ?;
      },
      {Slice => {}},
      $ftsQuery) or die "Couldn't load item list: " . $dbh->errstr . "\n";
  } else {
    $rows = $dbh->selectall_arrayref(q{
      SELECT item.id AS id, item.time as time, contentFTS.content AS content
      FROM item
      INNER JOIN contentFTS
      ON item.cid=contentFTS.id;
      },
      {Slice => {}}) or die "Couldn't load item list: " . $dbh->errstr . "\n";
  }
  my $items = [map {
    is_utf8($_->{content})
      or $_->{content} = decode_utf8($_->{content});
    YJournal::Item->new(%$_);
  } @$rows];

  for my $type (@$interestedAttrTypes) {
    for my $item (@$items) {
      $item->attribute($type,
        @{YJournal::Attribute::query($dbh, $item->id, $type)});
    }
  }

  $items;
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
