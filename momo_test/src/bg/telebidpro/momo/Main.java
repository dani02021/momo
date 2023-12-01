package bg.telebidpro.momo;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Scanner;

// Press Shift twice to open the Search Everywhere dialog and type `show whitespaces`,
// then press Enter. You can now see whitespace characters in your code.
public class Main {
    public static Bookshelf bookshelf;
    public static File booksFile = new File("./books.json");
    public static Connection conn;
    public static Scanner scanner;
    public static void main(String[] args) {
        while (true) {
        try {
            if(conn == null) {
                Class.forName("org.postgresql.Driver");
                conn = DriverManager
                        .getConnection("jdbc:postgresql://localhost:5432/momcho",
                                "momo", "momo");
            }

            if(bookshelf == null) {
                bookshelf = new Bookshelf(conn);
            }

            if(scanner == null) {
                scanner = new Scanner(System.in);
            }

            System.out.println(bookshelf.getHelpMessage());

            while (true) {
                int action = scanner.nextInt();

                if(action == 1) {
                    System.out.println("Please choose a book author!");
                    String author = scanner.next();
                    System.out.println("Please choose a book name!");
                    String name = scanner.next();
                    scanner.nextLine();
                    System.out.println("Please choose a book isbn!");
                    String isbn = scanner.next();
                    System.out.println("Please choose a book genre!");
                    String genre = scanner.next();

                    bookshelf.addBook(new Book(author,name,isbn,genre));
                }
                else if(action == 2) {
                    System.out.println("Please choose a book name!");
                    String name = scanner.next();

                    bookshelf.removeBook(bookshelf.getBook(name).getName());
                }
                else if(action == 3) {
                    System.out.println("Please choose a book name!");
                    String name = scanner.next();
                    System.out.println("Please choose a new book name!");
                    String newName = scanner.next();

                    Book updatedBook = bookshelf.getBook(name);
                    updatedBook.setName(newName);

                    bookshelf.updateBook(name, updatedBook);
                }
                else if(action == 4) {
                    System.out.println(bookshelf.listBooks());
                }
                else if(action == 5) {
                    System.out.println("Please choose a book name!");
                    String name = scanner.next();

                    System.out.println(bookshelf.parseTemplate(Bookshelf.DERFAULT_TEMPLATE, bookshelf.getBook(name)));
                }
                System.out.println(bookshelf.getHelpMessage());
            }
        } catch(Exception e) {
            System.err.println("DID YOU BREAK ME!!");
            e.printStackTrace();
        }
        }
    }
}