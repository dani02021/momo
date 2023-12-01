package bg.telebidpro.momo;

import org.json.simple.JSONObject;

import java.sql.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;

import static bg.telebidpro.momo.Assert.*;

public class Bookshelf {

    private Connection conn;

    public static final String DERFAULT_TEMPLATE = "This book is ##book## and this author is ##author##";
    public Bookshelf(Connection conn) {
        this.conn = conn;
    }

    protected ArrayList<Book> getBookSequel(String bookName) throws SQLException, AssertException {
        ASSERT(bookName != null, "Book not added successfully!");

        PreparedStatement stmt = conn.prepareStatement("SELECT * FROM books WHERE name = ?");

        stmt.setString(1, bookName);

        ResultSet result = stmt.executeQuery();
        ArrayList<Book> booksResult = new ArrayList<Book>();

        while(result.next()) {
            Book book = new Book(result.getString("author"), result.getString("name"), result.getString("isbn"), result.getString("genre"));

            booksResult.add(book);
        }

        return booksResult;
    }

    public Book getBook(String bookName) throws SQLException, AssertException {
        ASSERT(bookName != null, "Book name should not be null!");

        ArrayList<Book> books = getBookSequel(bookName);

        ASSERT( ! books.isEmpty(), "Book not found!");

        System.err.println(Arrays.toString(books.toArray()));

        return books.get(0);
    }

    protected int addBookSequel(Book book) throws SQLException {
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO books (isbn, name, author, genre) VALUES (?, ?, ?, ?)");

        stmt.setString(1, book.getIsbn());
        stmt.setString(2, book.getName());
        stmt.setString(3, book.getAuthor());
        stmt.setString(4, book.getGenre());

        return stmt.executeUpdate();
    }

    public void addBook(Book book) throws SQLException, AssertException {
        ASSERT(book != null, "Book should not be null!");

        int affectedRows = addBookSequel(book);

        ASSERT(affectedRows == 1, "Book not added successfully!");
    }

    protected int removeBookSequel(String bookName) throws SQLException {
        PreparedStatement stmt = conn.prepareStatement("DELETE FROM books WHERE name = ?");

        stmt.setString(1, bookName);

        return stmt.executeUpdate();
    }

    public void removeBook(String bookName) throws SQLException, AssertException {
        ASSERT(bookName != null, "Book name should not be null!");
        int affectedRows = removeBookSequel(bookName);

        ASSERT(affectedRows == 1, "Book not removed successfully!");
    }

    protected int updateBookSequel(String oldBookName, Book newBook) throws SQLException, AssertException {
        ASSERT(oldBookName != null, "Old book name should not be null!");
        ASSERT(newBook != null, "New book should not be null!");

        PreparedStatement stmt = conn.prepareStatement("UPDATE books SET isbn = ?, name = ?, author = ?, genre = ? WHERE name = ?");

        stmt.setString(1, newBook.getIsbn());
        stmt.setString(2, newBook.getName());
        stmt.setString(3, newBook.getAuthor());
        stmt.setString(4, newBook.getGenre());
        stmt.setString(5, oldBookName);

        return stmt.executeUpdate();
    }
    public void updateBook(String bookName, Book newBook) throws SQLException, AssertException {
        int affectedRows = updateBookSequel(bookName, newBook);

        ASSERT(affectedRows == 1, "Book not updated successfully!");
    }

    protected ArrayList<Book> listBooksSequel() throws SQLException, AssertException {
        Statement stmt = conn.createStatement();

        ResultSet result = stmt.executeQuery("SELECT * FROM books");
        ArrayList<Book> booksResult = new ArrayList<Book>();

        while(result.next()) {
            Book book = new Book(result.getString("author"), result.getString("name"), result.getString("isbn"), result.getString("genre"));

            booksResult.add(book);
        }

        return booksResult;
    }
    public String listBooks() throws SQLException, AssertException {
        JSONObject object = new JSONObject();

        ArrayList<Book> books = listBooksSequel();

        Iterator<Book> booksIt = books.iterator();
        while(booksIt.hasNext()) {
            Book book = booksIt.next();
            JSONObject jsonBook = new JSONObject();
            jsonBook.put("isbn", book.getIsbn());
            jsonBook.put("author", book.getAuthor());
            jsonBook.put("name", book.getName());
            jsonBook.put("genre", book.getGenre());

            object.put(book.getIsbn(), book);
        }

        return object.toString();
    }

    public String parseTemplate(String template, Book book) throws AssertException {
        ASSERT(template != null, "Template cannot be null");

        return template
                .replaceAll("##author##", book.getAuthor())
                .replaceAll("##book##", book.getName());
    }

    public String getHelpMessage() {
        return "Please select an option:\n(0) Print Help\n(1) Add bg.telebidpro.momo.Book\n(2) Remove bg.telebidpro.momo.Book\n(3) Update bg.telebidpro.momo.Book\n(4) List Books\n(5) Print Template";
    }
}
