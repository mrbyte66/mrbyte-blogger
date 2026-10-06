package com.satir.editorial.application;

import com.satir.editorial.infrastructure.EditorialWriteLock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EditorialCommands implements com.satir.platform.ContentWriteGuard {
    private final EditorialWriteLock lock;
    public EditorialCommands(EditorialWriteLock lock){this.lock=lock;}
    @Transactional(propagation=Propagation.MANDATORY) public void acquire(){lock.acquire();}
}
