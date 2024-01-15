package bg.telebidpro.momo;

import bg.telebidpro.momo.input.WebServer;

import java.io.File; 
import java.sql.Connection;
import java.util.Scanner;

// Press Shift twice to open the Search Everywhere dialog and type `show whitespaces`,
// then press Enter. You can now see whitespace characters in your code.
public class Main {
    public static Bookshelf bookshelf;
    public static File booksFile = new File("./books.json");
    public static Connection conn;
    public static Scanner scanner;
    public static WebServer webServer;

    public static void main(String[] args) {
        while (true) {
        try {
            if(conn == null) {
                Class.forName("org.postgresql.Driver");
                //conn = DriverManager
                //        .getConnection("jdbc:postgresql://localhost:5432/momcho",
                //                "momo", "momo");
            }

            if(bookshelf == null) {
                bookshelf = new Bookshelf(conn);
            }

            if(scanner == null) {
                scanner = new Scanner(System.in);
            }

            if(webServer == null) {
                webServer = new WebServer();
            }
        } catch(Exception e) {
            System.err.println("DID YOU BREAK ME!!");
            e.printStackTrace();
        }
        }
    }
}