package YJournal;
use Dancer ':syntax';
use Dancer::Plugin::REST;
use Dancer::Plugin::Database;
use DBI;
use Try::Tiny;
use YJournal::Content;
use YJournal::Item;
use YJournal::Attribute;

our $VERSION = '0.1';

prepare_serializer_for_format;

# Initialize database
my $dbname = "yjournal.db";
my $dbh = DBI->connect("dbi:SQLite:dbname=$dbname", "", "")
  or confess ("Couldn't connect to database '$dbname':" . $DBI::errstr);
YJournal::Content::init($dbh);
YJournal::Item::init($dbh);
YJournal::Attribute::init($dbh);

get '/' => sub {
    template 'index';
};

sub db {
  my $f = shift;

  $dbh->begin_work;
  try {
    my $ret = $f->(@_);
    $dbh->commit;
    $ret;
  } catch {
    my $error = $_;
    $dbh->rollback;
    send_error $error;
  }
}

post '/api/item.:format' => sub {
  db sub {YJournal::Item::create($dbh, content => params->{content})};
};

get '/api/item/:id.:format' => sub {
  db sub {YJournal::Item::retrieve($dbh, params->{id})};
};

put '/api/item/:id.:format' => sub {
  db sub {YJournal::Item::update($dbh, params->{id}, params->{content})};
};

del '/api/item/:id.:format' => sub {
  db sub {YJournal::Item::delete($dbh, params->{id})};
};

get '/api/item.:format' => sub {
  my $attrTypes;
  defined(params->{atypes})
    and $attrTypes = [split(/\s*,\s*/, params->{atypes})];
  db sub {YJournal::Item::query($dbh, $attrTypes)};
};

post '/api/item/:id/a/:type/:name.:format' => sub {
  db sub {
    YJournal::Attribute::create(
      $dbh,
      params->{id},
      params->{type},
      params->{name},
      params->{content});
  };
};

get '/api/item/:id/a/:type/:name.:format' => sub {
  db sub {
    YJournal::Attribute::retrieve(
      $dbh,
      params->{id},
      params->{type},
      params->{name});
  };
};

put '/api/item/:id/a/:type/:name.:format' => sub {
  db sub {
    YJournal::Attribute::update(
      $dbh,
      params->{id},
      params->{type},
      params->{name},
      params->{content});
  };
};

del '/api/item/:id/a/:type/:name.:format' => sub {
  db sub {
    YJournal::Attribute::delete(
      $dbh,
      params->{id},
      params->{type},
      params->{name});
  };
};

get '/api/item/:id/a/:type.:format' => sub {
  db sub {
    YJournal::Attribute::query(
      $dbh,
      params->{id},
      params->{type});
  };
};

true;
