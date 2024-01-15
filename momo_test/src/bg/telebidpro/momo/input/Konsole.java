package bg.telebidpro.momo.input;

import bg.telebidpro.momo.Book;
import bg.telebidpro.momo.Bookshelf;

import java.io.PrintStream;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Scanner;

import static bg.telebidpro.momo.error.Assert.*;
public class Konsole {
    private Scanner scanner;
    private HashMap functions;
    private Bookshelf bookshelf;
    public Konsole(Scanner scanner, Bookshelf bookshelf, HashMap functions) {
        this.scanner = scanner;
        this.functions = functions;
    }

    public void printHelpMessage(PrintStream out) {
        out.println(bookshelf.getHelpMessage());
    }

    public Bookshelf getBookshelf() {
        return bookshelf;
    }

    public void closeScanner() {
        scanner.close();
    }

    public <T> T waitForInput(InputType type) throws Exception {
        switch (type) {
            case INTEGER:
                return (T) Integer.valueOf(scanner.nextInt());
            default:
                ASSERT(false, "Still not implemented " + type);
        }

        return null;
    }

    public void runAction(int action) throws AssertException, SQLException {
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

    public enum InputType {
        INTEGER,
        STRING,
        LINE
    }
}