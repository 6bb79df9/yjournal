package YJournal;
use Dancer ':syntax';
use Dancer::Plugin::REST;
use Dancer::Plugin::Database;
use YJournal::DB;
use YJournal::Item;
use YJournal::Attribute;

our $VERSION = '0.1';

prepare_serializer_for_format;

my $dbh = YJournal::DB::init();

get '/' => sub {
    template 'index';
};

post '/api/item.:format' => sub {
  my ($ret, $error) = YJournal::Item::create($dbh, content => params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::retrieve($dbh, params->{id});
  defined($error)
    and send_error $error
    or return $ret;
};

put '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::update($dbh, params->{id}, params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

del '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::delete($dbh, params->{id});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/item.:format' => sub {
  my $attrTypes;
  defined(params->{atypes})
    and $attrTypes = [split(/\s*,\s*/, params->{atypes})];
  my ($ret, $error) = YJournal::Item::query($dbh, $attrTypes);
  defined($error)
    and send_error $error
    or return $ret;
};

post '/api/item/:id/a/:type/:name.:format' => sub {
  my ($ret, $error) = YJournal::Attribute::create(
    $dbh,
    params->{id},
    params->{type},
    params->{name},
    params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/item/:id/a/:type/:name.:format' => sub {
  my ($ret, $error) = YJournal::Attribute::retrieve(
    $dbh,
    params->{id},
    params->{type},
    params->{name});
  defined($error)
    and send_error $error
    or return $ret;
};

put '/api/item/:id/a/:type/:name.:format' => sub {
  my ($ret, $error) = YJournal::Attribute::update(
    $dbh,
    params->{id},
    params->{type},
    params->{name},
    params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

del '/api/item/:id/a/:type/:name.:format' => sub {
  my ($ret, $error) = YJournal::Attribute::delete(
    $dbh,
    params->{id},
    params->{type},
    params->{name});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/item/:id/a/:type.:format' => sub {
  my ($ret, $error) = YJournal::Attribute::query(
    $dbh,
    params->{id},
    params->{type});
  defined($error)
    and send_error $error
    or return $ret;
};

true;
