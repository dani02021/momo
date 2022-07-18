#! /usr/bin/perl -wT -l ~/perl5/lib/perl5

use DBI;
use Getopt::Std;
use Email::Sender::Simple qw(sendmail);
use Email::Simple;
use Email::Sender::Transport::SMTP qw();
use Try::Tiny;

use strict; use warnings;

getopt('up');

# print "@ARGV\n";

our($opt_u, $opt_p);

try {
    my $driver = "Pg";
    my $database = "ecommercenodejs";
    my $dsn = "DBI:$driver:dbname=$database;host=localhost;port=5432";
    my $user = defined($opt_u) ? $opt_u : die "No -u argument supplied!";
    my $pass = defined($opt_p) ? $opt_p : die "No -p argument supplied!";

    my $dbh = DBI->connect($dsn, $user, $pass, { RaiseError => 1 }) or die DBI::errstr;

    my $stmt = q(
            SELECT
                username, email, promotions.name, token
            FROM user_vouchers
            JOIN users          ON user_vouchers."userId"  = users.id
            JOIN vouchers       ON "voucherId"             = vouchers.id
                JOIN promotions ON "promotionId"           = promotions.id
            WHERE
                    "emailSend"      = false
                AND "emailConfirmed" = true
                AND active           = false
                AND NOW() BETWEEN   promotions."startDate"
                              AND   promotions."endDate";
            );
            
    my $sth = $dbh->prepare( $stmt  );
    my $rv = $sth->execute() or die $DBI::errstr;
    
    print $DBI::errstr if $rv < 0;
    
    while (my @row = $sth->fetchrow_array()) {
        print "a@row\n";
        
        my $to = $row[1];
        my $subject = 'Test E-Mail';
        my $promotion = $row[2];
        my $token = $row[3];
        my $message = "Promo: $promotion and your token is: $token";
        
        my $msg = Email::Simple->create(
            header  => [
                From    => 'danielgudjenev@gmail.com',
                To      => $to,
                Subject => 'Hey I just met you'
            ],
            body    => 'Hey yo!'
        );
    
        print "good";
        
        my $transport = Email::Sender::Transport::SMTP->new({
            host => 'smtp.gmail.com',
            port => 587,
            sasl_username => 'danielgudjenev@gmail.com',
            sasl_password => 'ynimcicxhgzifbct '
        });
        
        print "good";
        
        sendmail(
            $msg,
            $transport
        );
        
        print "Email Sent yo!\n$msg\n";
    }
} catch {
    die "Yay error caught! $_";
};
