package bg.telebidpro.momo;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.sql.*;
import java.util.ArrayList;

import static org.junit.Assert.*;
import static org.mockito.Mockito.*;
import static bg.telebidpro.momo.Assert.*;

public class BookshelfTest {
    private static Bookshelf bookshelf;
    private static Bookshelf bookshelfSpy;

    @Before
    public void setUp() {
        Connection conn = mock();
        bookshelf = new Bookshelf(conn);
        bookshelfSpy = spy(bookshelf);
    }

    @After
    public void tearDown() {
        reset(bookshelfSpy);
    }

    @Test
    public void testGetBook() throws SQLException, AssertException {
        ArrayList<Book> al = new ArrayList<>();
        al.add(new Book("Momo", "Gustavo", "gus", "momo"));

        doReturn(al).when(bookshelfSpy).getBookSequel("Gustavo");

        Book book = bookshelfSpy.getBook("Gustavo");

        assertEquals("Does not equal", book.getName(), "Gustavo");
    }

    @Test(expected = SQLException.class)
    public void testGetBookErr() throws SQLException, AssertException {
        ArrayList<Book> al = new ArrayList<>();

        doReturn(al).when(bookshelfSpy).getBookSequel("Gustavo");

        Book book = bookshelfSpy.getBook("Gustavo");
    }

    @Test
    // This test is pretty useless :O
    public void testAddBook() throws SQLException, AssertException {
        Book book = new Book("Momo", "Gustavo", "gus", "momo");

        doReturn(1).when(bookshelfSpy).addBookSequel(book);

        bookshelfSpy.addBook(book);
    }

    @Test(expected = SQLException.class)
    public void testAddBookErr() throws SQLException, AssertException {
        Book book = new Book("Momo", "Gustavo", "gus", "momo");

        doReturn(0).when(bookshelfSpy).addBookSequel(book);

        bookshelfSpy.addBook(book);
    }

    @Test
    public void testRemoveBook() throws SQLException, AssertException {
        doReturn(1).when(bookshelfSpy).removeBookSequel("Gustavo");

        bookshelfSpy.removeBook("Gustavo");
    }

    @Test(expected = SQLException.class)
    public void testRemoveBookErr() throws SQLException, AssertException {
        doReturn(0).when(bookshelfSpy).removeBookSequel("Gustavo");

        bookshelfSpy.removeBook("Gustavo");
    }

    @Test
    // Pretty useless
    public void testUpdateBook() throws SQLException, AssertException {
        doReturn(1).when(bookshelfSpy).updateBookSequel("Gustavo", new Book("Momo", "Gustavo", "gus", "momo"));

        bookshelfSpy.updateBook("Gustavo", new Book("Momo", "Gustavo", "gus", "momo"));
    }

    @Test(expected = SQLException.class)
    public void testUpdateBookErr() throws SQLException, AssertException {
        Book book = new Book("Momo", "Gustavo", "gus", "momo");
        doReturn(0).when(bookshelfSpy).updateBookSequel("Gustavo", book);

        bookshelfSpy.updateBook("Gustavo", book);
    }

    @Test
    // Pretty useless
    public void testListBooks() throws SQLException, AssertException {
        ArrayList<Book> al = new ArrayList<>();
        al.add(new Book("Momo", "Gustavo", "gus", "momo"));
        al.add(new Book("Bobo", "Mostavo", "amon", "momo"));
        doReturn(al).when(bookshelfSpy).listBooksSequel();

        bookshelfSpy.listBooks();
    }

    @Test
    public void testParseTemplate() throws SQLException, AssertException {
        String template = "This book is ##book## and this author is ##author##";
        String parsedTemplate = bookshelfSpy.parseTemplate(template, new Book("Momo", "Gustavo", "gus", "momo"));

        assertFalse("Template contains ##book##", parsedTemplate.contains("##book##"));
        assertFalse("Template contains ##author##", parsedTemplate.contains("##author##"));
    }
}
