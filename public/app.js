$(window).on('load', function() {
    $('#bootsplash').fadeOut(500);
});

$(document).ready(function() {
    var currentPage = 1;
    var currentSearch = '';
    var currentSort = 'name_asc';
    var currentView = 'list'; // 'list' or 'grid'

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
        $.get('/api/files', { 
            search: currentSearch, 
            page: currentPage,
            sortBy: currentSort
        }, function(data) {
            var fileList = $('#file-list');
            fileList.empty();

            if (data.files.length === 0) {
                fileList.append('<li>No files found.</li>');
                return;
            }

            var imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];

            data.files.forEach(function(file) {
                var isImage = imageTypes.indexOf(file.type) > -1;
                var listItem;

                if (currentView === 'grid' && !isImage) {
                    return; // Skip non-images in grid view
                }

                var modifiedDate = new Date(file.modifiedAt).toLocaleDateString();
                
                var actionsHtml = '<div class="file-actions">' +
                    '<button class="icon-btn preview-btn" title="Preview" data-filename="' + file.name + '" data-filetype="' + file.type + '">' +
                    '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' +
                    '</button>' +
                    '<a href="/download/' + file.name + '" class="icon-btn" title="Download">' +
                    '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>' +
                    '</a>' +
                    '<button class="icon-btn delete-btn" title="Delete" data-filename="' + file.name + '">' +
                    '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
                    '</button>' +
                    '</div>';

                var infoHtml = '<div class="file-info">' +
                    '<span class="file-name">' + file.name + '</span>' +
                    '<span class="file-meta">Size: ' + formatSize(file.size) + ' | Modified: ' + modifiedDate + '</span>' +
                    '</div>';

                if (currentView === 'grid') {
                    listItem = $('<li></li>').css('background-image', 'url(/download/' + file.name + ')');
                    listItem.append(infoHtml + actionsHtml);
                } else {
                    listItem = $('<li>' + infoHtml + actionsHtml + '</li>');
                }
                
                fileList.append(listItem);
            });

            // Update pagination controls
            $('#page-info').text('Page ' + data.page + ' of ' + Math.ceil(data.totalFiles / data.pageSize));
            $('#prev-page').prop('disabled', data.page <= 1);
            $('#next-page').prop('disabled', data.page * data.pageSize >= data.totalFiles);
        });
    }

    // --- VIEW SWITCHER ---
    $('#view-list-btn').on('click', function() {
        currentView = 'list';
        $('#file-list').removeClass('grid-view');
        $(this).addClass('active');
        $('#view-grid-btn').removeClass('active');
        loadFiles();
    });

    $('#view-grid-btn').on('click', function() {
        currentView = 'grid';
        $('#file-list').addClass('grid-view');
        $(this).addClass('active');
        $('#view-list-btn').removeClass('active');
        loadFiles();
    });

    function showNotification(message) {
        var notification = $('<div class="notification">' + message + '</div>');
        $('#notification-area').append(notification);
        setTimeout(function() {
            notification.fadeOut(500, function() {
                $(this).remove();
            });
        }, 3000);
    }

    // --- PREVIEW LOGIC ---
    var modal = $('#preview-modal');
    var previewData = $('#preview-data');

    function showPreview(filename, filetype) {
        var imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
        var textTypes = ['.txt', '.md', '.json', '.js', '.css', '.html'];

        previewData.empty(); // Clear previous content

        if (imageTypes.indexOf(filetype) > -1) {
            previewData.html('<img src="/download/' + filename + '">');
            modal.show();
        } else if (textTypes.indexOf(filetype) > -1) {
            $.get('/download/' + filename, function(data) {
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

    // Click on preview button
    $('#file-list').on('click', '.preview-btn', function() {
        var filename = $(this).data('filename');
        var filetype = $(this).data('filetype');
        showPreview(filename, filetype);
    });

    // Click on the whole row to preview
    $('#file-list').on('click', 'li', function(e) {
        // Don't trigger if a button or link was clicked
        if ($(e.target).closest('.file-actions').length > 0) {
            return;
        }
        var filename = $(this).find('.preview-btn').data('filename');
        var filetype = $(this).find('.preview-btn').data('filetype');
        showPreview(filename, filetype);
    });

    $('#preview-close, #preview-overlay').on('click', function() {
        modal.hide();
    });

    // Close modal with ESC key
    $(document).on('keydown', function(e) {
        if (e.keyCode === 27 && modal.is(':visible')) { // 27 is the key code for ESC
            modal.hide();
        }
    });

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
        var numFiles = files.length;
        for (var i = 0; i < numFiles; i++) {
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
                // Reset view to show the newest files first
                currentPage = 1;
                currentSort = 'modifiedAt_desc';
                $('#sort-select').val(currentSort);
                loadFiles(); 
                showNotification('Successfully uploaded ' + numFiles + ' file(s).');
                currentUploadXhr = null;
            },
            error: function(jqXHR, textStatus, errorThrown) {
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

    cancelBtn.on('click', function() {
        if (currentUploadXhr) {
            currentUploadXhr.abort();
        }
    });

    // Trigger file input from button
    uploadButton.on('click', function() {
        fileInput.click();
    });

    fileInput.on('change', function() {
        uploadFiles(this.files);
    });

    // Drag and drop events
    dropZone.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('dragover');
    });

    dropZone.on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
    });

    dropZone.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
        var files = e.originalEvent.dataTransfer.files;
        uploadFiles(files);
    });
    
    // Make the whole drop-zone clickable
    dropZone.on('click', function(e) {
        if (e.target === this || $(e.target).is('p')) {
             fileInput.click();
        }
    });


    // Initial load
    loadFiles();

    // Search functionality
    $('#search-input').on('keyup', function() {
        currentSearch = $(this).val();
        currentPage = 1; // Reset to first page
        loadFiles();
    });

    // Sort functionality
    $('#sort-select').on('change', function() {
        currentSort = $(this).val();
        currentPage = 1; // Reset to first page
        loadFiles();
    });

    // Refresh button
    $('#refresh-button').on('click', function() {
        loadFiles();
    });

    // Pagination controls
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadFiles();
        }
    });

    $('#next-page').on('click', function() {
        currentPage++;
        loadFiles();
    });

    // Handle delete button clicks
    $('#file-list').on('click', '.delete-btn', function() {
        var filename = $(this).data('filename');
        if (confirm('Are you sure you want to delete ' + filename + '?')) {
            $.ajax({
                url: '/api/files/' + filename,
                type: 'DELETE',
                success: function() {
                    loadFiles(); // Refresh the list
                },
                error: function() {
                    alert('Error deleting file.');
                }
            });
        }
    });
});