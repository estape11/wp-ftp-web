$(window).on('load', function() {
    $('#bootsplash').fadeOut(500);
});

$(document).ready(function() {
    $.ajaxSetup({ cache: false }); // Disable AJAX caching

    var currentPage = 1;
    var currentSearch = '';
    var currentSort = 'name_asc';
    var currentView = 'list';
    var currentPath = ''; // New state for current directory

    // --- STATE MANAGEMENT ---
    function saveState() {
        sessionStorage.setItem('ftp_currentPage', currentPage);
        sessionStorage.setItem('ftp_currentSearch', currentSearch);
        sessionStorage.setItem('ftp_currentSort', currentSort);
        sessionStorage.setItem('ftp_currentView', currentView);
        sessionStorage.setItem('ftp_currentPath', currentPath);
    }

    function loadState() {
        currentPage = parseInt(sessionStorage.getItem('ftp_currentPage')) || 1;
        currentSearch = sessionStorage.getItem('ftp_currentSearch') || '';
        currentSort = sessionStorage.getItem('ftp_currentSort') || 'name_asc';
        currentView = sessionStorage.getItem('ftp_currentView') || 'list';
        currentPath = sessionStorage.getItem('ftp_currentPath') || '';

        // Update UI
        $('#search-input').val(currentSearch);
        $('#sort-select').val(currentSort);
        if (currentView === 'grid') {
            $('#file-list').addClass('grid-view');
            $('#view-grid-btn').addClass('active');
            $('#view-list-btn').removeClass('active');
        } else {
            $('#file-list').removeClass('grid-view');
            $('#view-list-btn').addClass('active');
            $('#view-grid-btn').removeClass('active');
        }
    }

    // --- BREADCRUMB NAVIGATION ---
    function renderBreadcrumbs() {
        var breadcrumbContainer = $('#breadcrumb-container');
        breadcrumbContainer.empty();
        var pathParts = currentPath.split('/').filter(Boolean);

        var rootLink = $('<span class="breadcrumb-link">Root</span>').on('click', function() {
            navigateToPath('');
        });
        breadcrumbContainer.append(rootLink);

        var currentFullPath = '';
        pathParts.forEach(function(part) {
            currentFullPath += part + '/';
            var partLink = $('<span class="breadcrumb-link">' + part + '</span>').data('path', currentFullPath);
            breadcrumbContainer.append('<span class="breadcrumb-separator">/</span>').append(partLink);
        });

        breadcrumbContainer.on('click', '.breadcrumb-link', function() {
            var path = $(this).data('path');
            if (typeof path !== 'undefined') {
                navigateToPath(path);
            }
        });
    }

    function navigateToPath(path) {
        currentPath = path;
        currentPage = 1;
        loadFiles();
    }

    // Function to format file size
    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        var k = 1024;
        var sizes = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Function to refresh the file list
    function loadFiles() {
        saveState();
        renderBreadcrumbs();
        var pageSize = currentView === 'grid' ? 24 : 10;
        var fileList = $('#file-list');

        fileList.addClass('loading');

        $.get('/api/files', { 
            currentPath: currentPath,
            search: currentSearch, 
            page: currentPage,
            sortBy: currentSort,
            pageSize: pageSize
        }, function(data) {
            fileList.empty();

            if (data.files.length === 0) {
                fileList.append('<li>No files or folders found.</li>');
                return;
            }

            var imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];

            data.files.forEach(function(file) {
                var isImage = imageTypes.indexOf(file.type) > -1;
                var listItem;

                if (currentView === 'grid' && !isImage && !file.isDirectory) {
                    return; // Skip non-images in grid view (but show folders)
                }

                var modifiedDate = new Date(file.modifiedAt).toLocaleDateString();
                var fullPath = (currentPath ? currentPath + '/' : '') + file.name;

                var actionsHtml = '<div class="file-actions">' +
                    (file.isDirectory ? '' : '<button class="icon-btn preview-btn" title="Preview" data-path="' + fullPath + '" data-filetype="' + file.type + '"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>') +
                    (file.isDirectory ? '' : '<a href="/download?p=' + encodeURIComponent(fullPath) + '" class="icon-btn" title="Download"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>') +
                    '<button class="icon-btn delete-btn" title="Delete" data-path="' + fullPath + '"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>' +
                    '</div>';

                var folderIcon = '<svg class="folder-icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
                var infoHtml = '<div class="file-info">' +
                    (file.isDirectory ? folderIcon : '') +
                    '<span class="file-name">' + file.name + '</span>' +
                    '<span class="file-meta">' + (file.isDirectory ? '' : 'Size: ' + formatSize(file.size) + ' | ') + 'Modified: ' + modifiedDate + '</span>' +
                    '</div>';

                listItem = $('<li></li>').data('path', fullPath).data('isDirectory', file.isDirectory);

                if (currentView === 'grid') {
                    if (isImage) {
                        listItem.css('background-image', 'url(/download?p=' + encodeURIComponent(fullPath) + ')');
                    } else if (file.isDirectory) {
                        listItem.addClass('folder-tile');
                    }
                    listItem.append(infoHtml + actionsHtml);
                } else {
                    listItem.append(infoHtml).append(actionsHtml);
                }
                
                fileList.append(listItem);
            });

            // Update pagination controls
            $('#page-info').text('Page ' + data.page + ' of ' + Math.ceil(data.totalFiles / data.pageSize));
            $('#prev-page').prop('disabled', data.page <= 1);
            $('#next-page').prop('disabled', data.page * data.pageSize >= data.totalFiles);
        }).always(function() {
            fileList.removeClass('loading');
        });
    }

    // --- VIEW SWITCHER ---
    function switchView(newView) {
        if (currentView === newView) return;
        currentView = newView;
        var fileList = $('#file-list');
        fileList.addClass('view-out');
        setTimeout(function() {
            if (newView === 'grid') {
                fileList.addClass('grid-view');
                $('#view-grid-btn').addClass('active');
                $('#view-list-btn').removeClass('active');
            } else {
                fileList.removeClass('grid-view');
                $('#view-list-btn').addClass('active');
                $('#view-grid-btn').removeClass('active');
            }
            loadFiles();
            fileList.removeClass('view-out').addClass('view-in');
            setTimeout(function() { fileList.removeClass('view-in'); }, 200);
        }, 200);
    }

    $('#view-list-btn').on('click', function() { switchView('list'); });
    $('#view-grid-btn').on('click', function() { switchView('grid'); });

    function showNotification(message) {
        var notification = $('<div class="notification">' + message + '</div>');
        $('#notification-area').append(notification);
        setTimeout(function() { notification.fadeOut(500, function() { $(this).remove(); }); }, 3000);
    }

    // --- PREVIEW & FOLDER NAVIGATION ---
    var modal = $('#preview-modal');
    var previewData = $('#preview-data');

    function showPreview(filePath, filetype) {
        var imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
        var textTypes = ['.txt', '.md', '.json', '.js', '.css', '.html'];
        previewData.empty();

        if (imageTypes.indexOf(filetype) > -1) {
            previewData.html('<img src="/download?p=' + encodeURIComponent(filePath) + '">');
            modal.show();
        } else if (textTypes.indexOf(filetype) > -1) {
            $.get('/download?p=' + encodeURIComponent(filePath), function(data) {
                previewData.html('<pre>' + data + '</pre>');
                modal.show();
            }).fail(function() {
                previewData.html('<p>Could not load file content.</p>');
                modal.show();
            });
        } else {
            previewData.html('<p>Preview not available for this file type.</p>');
            modal.show();
        }
    }

    $('#file-list').on('click', 'li', function(e) {
        if ($(e.target).closest('.file-actions').length > 0) return;
        
        if ($(this).data('isDirectory')) {
            navigateToPath($(this).data('path'));
        } else {
            var btn = $(this).find('.preview-btn');
            showPreview(btn.data('path'), btn.data('filetype'));
        }
    });

    $('#preview-close, #preview-overlay').on('click', function() { modal.hide(); });
    $(document).on('keydown', function(e) { if (e.keyCode === 27 && modal.is(':visible')) { modal.hide(); } });

    // --- UPLOAD LOGIC ---
    var dropZone = $('#drop-zone');
    var uploadButton = $('#upload-button');
    var fileInput = $('#file-input');
    var progressContainer = $('#progress-container');
    var progressBar = $('#progress-bar');
    var cancelBtn = $('#cancel-upload-btn');
    var currentUploadXhr = null;

    function uploadFiles(files) {
        var formData = new FormData();
        formData.append('path', currentPath); // Add current path to upload
        for (var i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        progressContainer.show();
        progressBar.css('width', '0%');

        currentUploadXhr = $.ajax({
            url: '/api/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        progressBar.css('width', (percentComplete * 100) + '%');
                    }
                }, false);
                return xhr;
            },
            success: function() {
                progressContainer.hide();
                currentPage = 1;
                currentSort = 'modifiedAt_desc';
                $('#sort-select').val(currentSort);
                loadFiles(); 
                showNotification('Successfully uploaded ' + files.length + ' file(s).');
                currentUploadXhr = null;
            },
            error: function(jqXHR, textStatus) {
                progressContainer.hide();
                if (textStatus === 'abort') {
                    showNotification('Upload cancelled.');
                } else {
                    alert('Upload failed.');
                }
                currentUploadXhr = null;
            }
        });
    }

    cancelBtn.on('click', function() { if (currentUploadXhr) { currentUploadXhr.abort(); } });
    uploadButton.on('click', function() { fileInput.click(); });
    fileInput.on('change', function() { uploadFiles(this.files); });
    dropZone.on('dragover', function(e) { e.preventDefault(); $(this).addClass('dragover'); });
    dropZone.on('dragleave', function(e) { $(this).removeClass('dragover'); });
    dropZone.on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        uploadFiles(e.originalEvent.dataTransfer.files);
    });
    dropZone.on('click', function(e) { if (e.target === this || $(e.target).is('p')) { fileInput.click(); } });

    // --- INITIAL LOAD & EVENT BINDINGS ---
    loadState();
    loadFiles();

    $('#search-input').on('keyup', function() {
        currentSearch = $(this).val();
        currentPage = 1;
        loadFiles();
    });

    $('#sort-select').on('change', function() {
        currentSort = $(this).val();
        currentPage = 1;
        loadFiles();
    });

    $('#refresh-button').on('click', loadFiles);

    $('#new-folder-btn').on('click', function() {
        var folderName = prompt("Enter a name for the new folder:");
        if (folderName) {
            $.ajax({
                url: '/api/folders',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ currentPath: currentPath, folderName: folderName }),
                success: function() {
                    loadFiles();
                    showNotification('Folder "' + folderName + '" created.');
                },
                error: function() {
                    alert('Error creating folder.');
                }
            });
        }
    });

    $('#prev-page').on('click', function() { if (currentPage > 1) { currentPage--; loadFiles(); } });
    $('#next-page').on('click', function() { currentPage++; loadFiles(); });

    $('#file-list').on('click', '.delete-btn', function(e) {
        e.stopPropagation(); // Prevent row click from firing
        var pathToDelete = $(this).data('path');
        if (confirm('Are you sure you want to delete "' + pathToDelete + '"?')) {
            $.ajax({
                url: '/api/delete',
                type: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ p: pathToDelete }),
                success: function() {
                    loadFiles();
                    showNotification('"' + pathToDelete + '" was deleted.');
                },
                error: function() {
                    alert('Error deleting item.');
                }
            });
        }
    });
});