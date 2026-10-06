package com.satir.editorial.infrastructure;

import java.util.UUID;
import java.util.Optional;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class CategoryRepository {
    private final JdbcClient jdbc;
    public CategoryRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Category(UUID id,String slug,String name,long version){}
    private Category read(java.sql.ResultSet r)throws java.sql.SQLException{return new Category(r.getObject("id",UUID.class),r.getString("slug"),r.getString("name"),r.getLong("version"));}
    public List<Category> list(boolean owner){return jdbc.sql("select c.* from category c "+(owner?"":"where exists(select 1 from article_category ac join article a on a.id=ac.article_id where ac.category_id=c.id and a.status='published' and a.visibility='public') ")+"order by c.name collate satir_turkish,c.id").query((r,n)->read(r)).list();}
    public Category create(UUID id,String name,String slug){jdbc.sql("insert into category(id,name,slug) values (?,?,?)").params(id,name,slug).update();return find(id).orElseThrow();}
    public Optional<Category> find(UUID id){return jdbc.sql("select * from category where id=?").param(id).query((r,n)->read(r)).optional();}
    public boolean update(UUID id,long version,String name,String slug){return jdbc.sql("update category set name=?,slug=?,version=version+1 where id=? and version=?").params(name,slug,id,version).update()>0;}
    public void delete(UUID id){jdbc.sql("delete from category where id=?").param(id).update();}
}
